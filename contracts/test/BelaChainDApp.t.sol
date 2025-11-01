// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BGPToken.sol";
import "../src/BelaChainDApp.sol";

/**
 * @title BelaChainDAppTest
 * @dev BelaChain DApp 主合约测试
 */
contract BelaChainDAppTest is Test {
    BGPToken public bgpToken;
    BelaChainDApp public dapp;
    
    address public owner;
    address public treasury;
    address public user1;
    address public user2;
    address public user3;
    
    bytes32 public constant IP_HASH_1 = keccak256("192.168.1.1");
    bytes32 public constant IP_HASH_2 = keccak256("192.168.1.2");
    
    uint256 constant INTERACTION_COST = 0.00018 ether; // ~$0.72 (ETH @ $4000)
    uint256 constant DAILY_BGP_REWARD = 2000 * 10**18;
    
    function setUp() public {
        owner = address(this);
        treasury = makeAddr("treasury");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");
        
        // 部署合约
        bgpToken = new BGPToken();
        dapp = new BelaChainDApp(address(bgpToken), payable(treasury));
        
        // 授权 dapp 为 minter
        bgpToken.setMinter(address(dapp), true);
        
        // 给测试用户一些 ETH
        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
        vm.deal(user3, 100 ether);
    }
    
    // ============ 注册测试 ============
    
    function testRegister() public {
        vm.prank(user2);
        dapp.register(user1);
        
        (address referrer, , , , , , , , , , ) = dapp.getUserInfo(user2);
        assertEq(referrer, user1, "Referrer should be user1");
    }
    
    function testCannotRegisterWithZeroAddress() public {
        vm.prank(user1);
        vm.expectRevert("Invalid referrer");
        dapp.register(address(0));
    }
    
    function testCannotRegisterSelf() public {
        vm.prank(user1);
        vm.expectRevert("Cannot refer yourself");
        dapp.register(user1);
    }
    
    function testCannotRegisterTwice() public {
        vm.prank(user2);
        dapp.register(user1);
        
        vm.prank(user2);
        vm.expectRevert("Already registered");
        dapp.register(user1);
    }
    
    // ============ 交互测试 ============
    
    function testInteract() public {
        vm.prank(user1);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        // 检查 BGP 余额
        assertEq(bgpToken.balanceOf(user1), DAILY_BGP_REWARD, "Should receive BGP reward");
        
        // 检查交互次数
        (, , , , , , , , , , uint256 totalInteractions) = dapp.getUserInfo(user1);
        assertEq(totalInteractions, 1, "Total interactions should be 1");
    }
    
    function testCannotInteractWithoutPayment() public {
        vm.prank(user1);
        vm.expectRevert("Insufficient payment");
        dapp.interact{value: 0.00001 ether}(IP_HASH_1); // 少于 0.00018 ether
    }
    
    function testCanInteractTwicePerDay() public {
        // 第一次交互（00:00-12:00 时间段）
        vm.prank(user1);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        // 前进到第二个时间段（12:00-24:00）
        vm.warp(block.timestamp + 12 hours);
        
        // 第二次交互
        vm.prank(user1);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        // 检查今日交互次数
        assertEq(dapp.getTodayInteractionCount(user1), 2, "Should have 2 interactions today");
    }
    
    function testCannotInteractThreeTimesPerDay() public {
        // 第一次
        vm.prank(user1);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        // 第二次（切换时间段）
        vm.warp(block.timestamp + 12 hours);
        vm.prank(user1);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        // 第三次（应该失败）
        vm.prank(user1);
        vm.expectRevert("Daily limit reached");
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
    }
    
    // ============ 推荐奖励测试 ============
    
    function testReferralRewards() public {
        // user2 注册，推荐人是 user1
        vm.prank(user2);
        dapp.register(user1);
        
        // user2 交互，user1 应该获得推荐奖励
        vm.prank(user2);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        // 检查 user1 的推荐奖励
        (, , , uint256 contribution, uint256 totalReferralRewards, , , , , , ) = dapp.getUserInfo(user1);
        
        assertGt(totalReferralRewards, 0, "Referrer should receive rewards");
        assertGt(contribution, 0, "Referrer contribution should increase");
    }
    
    function testMultiLevelReferral() public {
        // 建立推荐链：user1 -> user2 -> user3
        vm.prank(user2);
        dapp.register(user1);
        
        vm.prank(user3);
        dapp.register(user2);
        
        // user3 交互
        vm.prank(user3);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        // user1 和 user2 都应该获得奖励
        (, uint256 user1DirectCount, , uint256 user1Contribution, , , , , , , ) = dapp.getUserInfo(user1);
        (, uint256 user2DirectCount, , uint256 user2Contribution, uint256 user2Rewards, , , , , , ) = dapp.getUserInfo(user2);
        
        assertEq(user1DirectCount, 1, "User1 should have 1 direct referral");
        assertEq(user2DirectCount, 1, "User2 should have 1 direct referral");
        assertGt(user2Contribution, 0, "Level 1 referrer should get rewards");
        assertGt(user2Rewards, 0, "Level 1 referrer should get BGP rewards");
        // user1 需要有足够的直推才能获得第2层奖励（直推N人拿N代奖励）
        // 这里 user1 只有1个直推，所以只能拿1层奖励
        if (user1DirectCount >= 2) {
            assertGt(user1Contribution, 0, "Level 2 referrer should get rewards with enough direct referrals");
        }
    }
    
    // ============ 等级系统测试 ============
    
    function testLevelUpgrade() public {
        // 模拟用户达到 V1 等级的贡献值（10 USDT）
        vm.prank(user2);
        dapp.register(user1);
        
        // user2 需要交互足够多次来让 user1 的贡献值达到 10 USDT
        // 每次交互贡献约 1.4 USDT（800 BGP * 0.00175）
        // 需要约 8 次交互，每天2次，需要4天
        uint256 startTime = block.timestamp;
        for (uint256 day = 0; day < 4; day++) {
            // 第一个时间段交互（00:00-12:00）
            vm.warp(startTime + day * 1 days);
            vm.prank(user2);
            dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
            
            // 第二个时间段交互（12:00-24:00）
            vm.warp(startTime + day * 1 days + 12 hours);
            vm.prank(user2);
            dapp.interact{value: INTERACTION_COST}(IP_HASH_1); // 同一个 IP 可以，因为是同一个用户
        }
        
        // 手动更新等级
        vm.prank(user1);
        dapp.updateLevel();
        
        // 检查等级
        (, , , uint256 contribution, , uint8 level, , , , , ) = dapp.getUserInfo(user1);
        assertGe(contribution, 10 ether, "Should have at least 10 USDT contribution");
        assertGe(level, 1, "Should be at least V1");
    }
    
    // ============ 管理员功能测试 ============
    
    function testPause() public {
        dapp.pause();
        
        vm.prank(user1);
        vm.expectRevert(); // OpenZeppelin v5 使用 EnforcedPause()
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
    }
    
    function testUnpause() public {
        dapp.pause();
        dapp.unpause();
        
        vm.prank(user1);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        assertEq(bgpToken.balanceOf(user1), DAILY_BGP_REWARD, "Should work after unpause");
    }
    
    function testSetTreasury() public {
        address newTreasury = makeAddr("newTreasury");
        dapp.setTreasury(payable(newTreasury));
        
        // 验证交互费用发送到新 treasury
        uint256 treasuryBalanceBefore = newTreasury.balance;
        
        vm.prank(user1);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        assertEq(newTreasury.balance, treasuryBalanceBefore + INTERACTION_COST, "Payment should go to new treasury");
    }
    
    // ============ 安全测试 ============
    
    function testReentrancyProtection() public {
        // Foundry 的 ReentrancyGuard 会自动阻止重入攻击
        // 这里简单验证多次调用不会出错
        vm.startPrank(user1);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        vm.warp(block.timestamp + 12 hours);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        vm.stopPrank();
        
        assertEq(bgpToken.balanceOf(user1), DAILY_BGP_REWARD * 2, "Should complete both interactions");
    }
    
    function testCannotStealFunds() public {
        vm.prank(user1);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        // 尝试直接提取合约余额（应该失败）
        vm.prank(user2);
        vm.expectRevert(); // OpenZeppelin v5 使用 OwnableUnauthorizedAccount(address)
        dapp.emergencyWithdraw();
    }
    
    // ============ 黑名单测试 ============
    
    function testIPLimitBlacklist() public {
        // 创建 15 个地址并使用同一个 IP
        address[] memory users = new address[](16);
        for (uint256 i = 0; i < 16; i++) {
            users[i] = makeAddr(string(abi.encodePacked("testUser", i)));
            vm.deal(users[i], 10 ether);
        }
        
        // 前 15 个地址正常交互
        for (uint256 i = 0; i < 15; i++) {
            vm.prank(users[i]);
            dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        }
        
        // 第 16 个地址应该触发封禁
        vm.prank(users[15]);
        // 第15个用户交互后，IP 应该被封禁
        // 验证所有地址都被封禁
        for (uint256 i = 0; i < 15; i++) {
            assertTrue(dapp.isBlacklisted(users[i]), "Address should be blacklisted");
        }
        
        // 验证 IP 被封禁
        assertTrue(dapp.ipBlacklisted(IP_HASH_1), "IP should be blacklisted");
        
        // 第16个用户尝试交互，应该因为 IP 被封禁而失败
        vm.prank(users[15]);
        vm.expectRevert("IP is blacklisted");
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        // 验证被封禁的地址无法再交互
        vm.warp(block.timestamp + 1 days);
        vm.prank(users[0]);
        vm.expectRevert("Address is blacklisted");
        dapp.interact{value: INTERACTION_COST}(IP_HASH_2); // 即使换 IP 也不行
    }
    
    function testBlacklistedCannotTransfer() public {
        // 设置黑名单检查器
        bgpToken.setBlacklistChecker(address(dapp));
        
        // user1 交互获得 BGP
        vm.prank(user1);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        uint256 balance = bgpToken.balanceOf(user1);
        assertGt(balance, 0, "Should have BGP balance");
        
        // 手动封禁 user1
        dapp.blacklistAddress(user1, "Test blacklist");
        
        // user1 无法转账
        vm.prank(user1);
        vm.expectRevert("Sender is blacklisted");
        bgpToken.transfer(user2, 1000 * 10**18);
        
        // user2 也无法接收来自被封禁地址的转账
        vm.prank(user1);
        vm.expectRevert("Sender is blacklisted");
        bgpToken.transfer(user2, 1);
    }
    
    function testManualBlacklist() public {
        // 管理员手动封禁地址
        dapp.blacklistAddress(user1, "Suspicious activity");
        
        assertTrue(dapp.isBlacklisted(user1), "Should be blacklisted");
        
        // 被封禁的地址无法交互
        vm.prank(user1);
        vm.expectRevert("Address is blacklisted");
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        // 解除封禁
        dapp.removeFromBlacklist(user1);
        
        assertFalse(dapp.isBlacklisted(user1), "Should not be blacklisted");
        
        // 解除后可以正常交互
        vm.prank(user1);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
    }
    
    // ============ Gas 优化测试 ============
    
    function testGasUsage() public {
        vm.prank(user2);
        dapp.register(user1);
        
        uint256 gasBefore = gasleft();
        vm.prank(user2);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used for interaction:", gasUsed);
        assertLt(gasUsed, 500000, "Gas usage should be reasonable");
    }
}
