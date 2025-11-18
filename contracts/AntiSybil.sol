// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IAntiSybil {
    function isBlacklisted(address user) external view returns (bool);
    function registerAddress(address user, bytes16 ip) external;

    event AddressBlacklisted(address indexed user, string reason);
    event AddressUnblacklisted(address indexed user);
    event IPBlacklisted(bytes16 indexed ip, uint256 bannedAddressCount);
}

contract AntiSybil is IAntiSybil, Ownable, Pausable {
    uint256 public constant MAX_ADDRESSES_PER_IP = 15; 
    address public dappContract;

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
    event AddressRegistered(address indexed user, bytes16 indexed ip);

    modifier onlyDapp() {
        require(msg.sender == dappContract, "AntiSybil: Caller is not the DApp contract");
        _;
    }

    constructor() Ownable(msg.sender) {}

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

    function registerAddress(address user, bytes16 ip) 
        external 
        override 
        onlyDapp      
        whenNotPaused 
    {
        require(user != address(0), "AntiSybil: Invalid user address");
        require(!isBlacklisted[user], "AntiSybil: Address is blacklisted");
        require(addressToIP[user] == bytes16(0), "AntiSybil: Address already registered");
        require(!ipBlacklisted[ip], "AntiSybil: IP is blacklisted");
        
        if (ip == bytes16(0)) {
            addressToIP[user] = bytes16(0); 
            totalRegisteredAddresses++;
            emit AddressRegistered(user, ip);
            return;
        }

        address[] storage addresses = ipToAddresses[ip];
        
        // 如果超过限制，允许注册但自动封禁该地址和IP
        if (addresses.length >= MAX_ADDRESSES_PER_IP) {
            // 注册地址（用于后续追踪）
            addresses.push(user);
            addressToIP[user] = ip;
            totalRegisteredAddresses++;
            emit AddressRegistered(user, ip);
            
            // 自动封禁这个超限的地址
            isBlacklisted[user] = true;
            emit AddressBlacklisted(user, "Exceeded max addresses per IP limit");
            
            // 自动封禁这个IP及其所有关联的地址
            _banIPAndAssociatedAddresses(ip, "IP blacklisted due to exceeding max addresses limit");
            return;
        }

        if (addresses.length == 0) {
            totalUniqueIPs++; 
        }
        
        addresses.push(user);
        addressToIP[user] = ip;
        totalRegisteredAddresses++;
        
        emit AddressRegistered(user, ip);
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
}