// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

interface IAntiSybil {
    function isBlacklisted(address user) external view returns (bool);
    function registerAddress(
        address user,
        bytes16 ipAddr,
        uint256 timestamp,
        bytes calldata signature
    ) external;

    event AddressBlacklisted(address indexed user, string reason);
    event AddressUnblacklisted(address indexed user);
    event IPBlacklisted(bytes16 indexed ip, uint256 bannedAddressCount);
}

contract AntiSybil is IAntiSybil, Ownable, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    uint256 public constant MAX_ADDRESSES_PER_IP = 15;
    uint256 public constant SIGNATURE_VALIDITY = 30 minutes; // 签名有效期

    address public dappContract;
    address public ipSigner; // IP 签名者地址（服务器私钥对应的公钥地址）

    mapping(address => bool) public override isBlacklisted; // EVM 地址黑名单
    mapping(bytes16 => bool) public ipBlacklisted; // IP(bytes16) 黑名单
    // IP -> 关联的 EVM 地址列表
    mapping(bytes16 => address[]) public ipToAddresses;
    // 反向查询：EVM 地址 -> 注册时用的 IP
    mapping(address => bytes16) public addressToIP;

    uint256 public totalRegisteredAddresses; // 统计：总注册地址数
    uint256 public totalUniqueIPs; // 统计：总独立IP数

    function getAddressesForIP(bytes16 ip) external view returns (address[] memory) {
        return ipToAddresses[ip];
    }

    function getIPForAddress(address user) external view returns (bytes16) {
        return addressToIP[user];
    }

    event DAppContractUpdated(address indexed newDappContract);
    event IPSignerUpdated(address indexed newSigner);
    event AddressRegistered(address indexed user, bytes16 indexed ip);

    modifier onlyDapp() {
        require(msg.sender == dappContract, "AntiSybil: Caller is not the DApp contract");
        _;
    }

    constructor(address _ipSigner) Ownable(msg.sender) {
        ipSigner = _ipSigner;
        emit IPSignerUpdated(_ipSigner);
    }

    /**
     * @dev 验证 IP 签名
     * @param user 用户地址
     * @param ipAddr IP 地址 (bytes16)
     * @param timestamp 签名时间戳
     * @param signature 服务器签名
     */
    function _verifyIPSignature(
        address user,
        bytes16 ipAddr,
        uint256 timestamp,
        bytes calldata signature
    ) internal view returns (bool) {
        // 如果没有设置签名者，跳过验证（向后兼容）
        if (ipSigner == address(0)) {
            return true;
        }

        // 检查时间戳有效性（30分钟内）
        require(
            block.timestamp <= timestamp + SIGNATURE_VALIDITY,
            "AntiSybil: Signature expired"
        );
        require(
            block.timestamp >= timestamp - 60, // 允许1分钟的时钟偏差
            "AntiSybil: Invalid timestamp"
        );

        // 构造签名消息: keccak256(user, ipAddr, timestamp)
        bytes32 messageHash = keccak256(abi.encodePacked(user, ipAddr, timestamp));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();

        // 恢复签名者地址
        address recoveredSigner = ethSignedHash.recover(signature);

        return recoveredSigner == ipSigner;
    }

    function _banIPAndAssociatedAddresses(bytes16 ip, string memory reason) private {
        ipBlacklisted[ip] = true;

        address[] storage addressesToBan = ipToAddresses[ip];
        for (uint256 i = 0; i < addressesToBan.length; i++) {
            address user = addressesToBan[i];
            if (!isBlacklisted[user]) {
                isBlacklisted[user] = true;
                emit AddressBlacklisted(user, reason);
            }
        }

        emit IPBlacklisted(ip, addressesToBan.length);
    }

    function registerAddress(
        address user,
        bytes16 ipAddr,
        uint256 timestamp,
        bytes calldata signature
    )
        external
        override
        onlyDapp
        whenNotPaused
    {
        require(user != address(0), "AntiSybil: Invalid user address");
        require(!isBlacklisted[user], "AntiSybil: Address is blacklisted");
        require(addressToIP[user] == bytes16(0), "AntiSybil: Address already registered");
        require(!ipBlacklisted[ipAddr], "AntiSybil: IP is blacklisted");

        // 验证签名
        require(
            _verifyIPSignature(user, ipAddr, timestamp, signature),
            "AntiSybil: Invalid IP signature"
        );

        if (ipAddr == bytes16(0)) {
            addressToIP[user] = bytes16(0);
            totalRegisteredAddresses++;
            emit AddressRegistered(user, ipAddr);
            return;
        }

        address[] storage addresses = ipToAddresses[ipAddr];

        // 如果超过限制，允许注册但自动封禁该地址和IP
        if (addresses.length >= MAX_ADDRESSES_PER_IP) {
            // 注册地址（用于后续追踪）
            addresses.push(user);
            addressToIP[user] = ipAddr;
            totalRegisteredAddresses++;
            emit AddressRegistered(user, ipAddr);

            // 自动封禁这个超限的地址
            isBlacklisted[user] = true;
            emit AddressBlacklisted(user, "Exceeded max addresses per IP limit");

            // 自动封禁这个IP及其所有关联的地址
            _banIPAndAssociatedAddresses(ipAddr, "IP blacklisted due to exceeding max addresses limit");
            return;
        }

        if (addresses.length == 0) {
            totalUniqueIPs++;
        }

        addresses.push(user);
        addressToIP[user] = ipAddr;
        totalRegisteredAddresses++;

        emit AddressRegistered(user, ipAddr);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function blacklistAddress(address user, string calldata reason) external onlyOwner {
        require(!isBlacklisted[user], "Already blacklisted");
        isBlacklisted[user] = true;
        emit AddressBlacklisted(user, reason);
    }

    function removeFromBlacklist(address user) external onlyOwner {
        require(isBlacklisted[user], "Not blacklisted");
        isBlacklisted[user] = false;
        emit AddressUnblacklisted(user);
    }

    function blacklistIP(bytes16 ip, string calldata reason) external onlyOwner {
        require(!ipBlacklisted[ip], "AntiSybil: IP already blacklisted");
        _banIPAndAssociatedAddresses(ip, reason);
    }

    function setDappContract(address _newDappContract) external onlyOwner {
        require(_newDappContract != address(0), "AntiSybil: DApp contract address cannot be zero");
        dappContract = _newDappContract;
        emit DAppContractUpdated(_newDappContract);
    }

    /**
     * @dev 设置 IP 签名者地址（服务器公钥对应的地址）
     * @param _newSigner 新的签名者地址，设置为 address(0) 可禁用签名验证
     */
    function setIPSigner(address _newSigner) external onlyOwner {
        ipSigner = _newSigner;
        emit IPSignerUpdated(_newSigner);
    }
}
