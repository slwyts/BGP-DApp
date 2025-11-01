// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BGPToken
 * @dev BelaChain 生态激励代币
 * 总供应量: 10,000,000,000 (100亿)
 */
contract BGPToken is ERC20, Ownable, Pausable {
    uint256 public constant MAX_SUPPLY = 10_000_000_000 * 10**18; // 100亿
    
    // Minter 权限管理
    mapping(address => bool) public isMinter;
    
    // 黑名单检查器（主合约地址）
    address public blacklistChecker;
    
    // 早期用户奖励（前1万名）
    uint256 public constant EARLY_USER_REWARD = 5000 * 10**18; // 5000 BGP
    uint256 public earlyUserCount;
    uint256 public constant MAX_EARLY_USERS = 10000;
    
    mapping(address => bool) public hasClaimedEarlyReward;
    
    event EarlyRewardClaimed(address indexed user, uint256 amount);
    event MinterUpdated(address indexed minter, bool status);
    event BlacklistCheckerUpdated(address indexed checker);
    
    constructor() ERC20("BelaChain Growth Points", "BGP") Ownable(msg.sender) {
        // 初始不铸造代币，按需铸造
    }
    
    /**
     * @dev 设置 minter 权限
     */
    function setMinter(address minter, bool status) external onlyOwner {
        isMinter[minter] = status;
        emit MinterUpdated(minter, status);
    }
    
    /**
     * @dev 设置黑名单检查器（主合约）
     */
    function setBlacklistChecker(address checker) external onlyOwner {
        blacklistChecker = checker;
        emit BlacklistCheckerUpdated(checker);
    }
    
    /**
     * @dev 检查地址是否被封禁
     */
    function _isBlacklisted(address user) internal view returns (bool) {
        if (blacklistChecker == address(0)) return false;
        
        // 调用主合约的 isBlacklisted 函数
        (bool success, bytes memory result) = blacklistChecker.staticcall(
            abi.encodeWithSignature("isBlacklisted(address)", user)
        );
        
        if (success && result.length > 0) {
            return abi.decode(result, (bool));
        }
        
        return false;
    }
    
    /**
     * @dev 铸造代币（仅 minter）
     */
    function mint(address to, uint256 amount) external {
        require(isMinter[msg.sender], "Not a minter");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }
    
    /**
     * @dev 批量铸造（gas 优化）
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) 
        external 
        onlyOwner 
    {
        require(recipients.length == amounts.length, "Length mismatch");
        
        uint256 totalAmount;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(totalSupply() + totalAmount <= MAX_SUPPLY, "Exceeds max supply");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }
    
    /**
     * @dev 销毁代币
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    /**
     * @dev 领取早期用户奖励（前1万名）
     */
    function claimEarlyUserReward() external whenNotPaused {
        require(earlyUserCount < MAX_EARLY_USERS, "Early user quota full");
        require(!hasClaimedEarlyReward[msg.sender], "Already claimed");
        require(totalSupply() + EARLY_USER_REWARD <= MAX_SUPPLY, "Exceeds max supply");
        
        hasClaimedEarlyReward[msg.sender] = true;
        earlyUserCount++;
        
        _mint(msg.sender, EARLY_USER_REWARD);
        
        emit EarlyRewardClaimed(msg.sender, EARLY_USER_REWARD);
    }
    
    /**
     * @dev 暂停合约
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev 恢复合约
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev 重写 transfer，添加暂停和黑名单检查
     */
    function transfer(address to, uint256 amount) 
        public 
        override 
        whenNotPaused 
        returns (bool) 
    {
        require(!_isBlacklisted(msg.sender), "Sender is blacklisted");
        require(!_isBlacklisted(to), "Recipient is blacklisted");
        return super.transfer(to, amount);
    }
    
    /**
     * @dev 重写 transferFrom，添加暂停和黑名单检查
     */
    function transferFrom(address from, address to, uint256 amount) 
        public 
        override 
        whenNotPaused 
        returns (bool) 
    {
        require(!_isBlacklisted(from), "Sender is blacklisted");
        require(!_isBlacklisted(to), "Recipient is blacklisted");
        return super.transferFrom(from, to, amount);
    }
}
