// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BGPToken.sol";
import "../src/BelaChainDApp.sol";
import "../src/test/MockUSDT.sol";

/**
 * @title BelaChainDAppTest
 * @dev BelaChain DApp 主合约测试 (USDT 6位精度)
 */
contract BelaChainDAppTest is Test {
    BGPToken public bgpToken;
    MockUSDT public usdtToken;
    BelaChainDApp public dapp;
    
    address public owner;
    address public treasury;
    address public user1;
    address public user2;
    address public user3;
    
    bytes32 public constant IP_HASH_1 = keccak256("192.168.1.1");
    bytes32 public constant IP_HASH_2 = keccak256("192.168.1.2");
    
    uint256 constant INTERACTION_COST = 0.00018 ether;
    uint256 constant DAILY_BGP_REWARD = 2000 * 10**18;
    
    function setUp() public {
        owner = address(this);
        treasury = makeAddr("treasury");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");
        
        // 部署合约
        bgpToken = new BGPToken();
        usdtToken = new MockUSDT();
        dapp = new BelaChainDApp(address(bgpToken), address(usdtToken), payable(treasury));
        
        // 授权 dapp 为 BGP minter
        bgpToken.setMinter(address(dapp), true);
        bgpToken.setBlacklistChecker(address(dapp));

        // 给 DApp 合约一些 USDT 用于奖励
        usdtToken.mint(address(dapp), 1_000_000 * 10**6); // 1,000,000 USDT
        
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
        
        assertEq(bgpToken.balanceOf(user1), DAILY_BGP_REWARD, "Should receive BGP reward");
        
        (, , , , , , , , , , uint256 totalInteractions) = dapp.getUserInfo(user1);
        assertEq(totalInteractions, 1, "Total interactions should be 1");
    }
    
    function testCanInteractTwicePerDay() public {
        vm.prank(user1);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        vm.warp(block.timestamp + 12 hours);
        
        vm.prank(user1);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        assertEq(dapp.getTodayInteractionCount(user1), 2, "Should have 2 interactions today");
    }
    
    function testCannotInteractThreeTimesPerDay() public {
        vm.prank(user1);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        vm.warp(block.timestamp + 12 hours);
        vm.prank(user1);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        vm.prank(user1);
        vm.expectRevert("Daily limit reached");
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
    }
    
    // ============ 推荐奖励测试 ============
    
    function testReferralRewards() public {
        vm.prank(user2);
        dapp.register(user1);
        
        vm.prank(user2);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        (, , , uint256 contribution, uint256 totalReferralRewards, , , , , , ) = dapp.getUserInfo(user1);
        
        assertGt(totalReferralRewards, 0, "Referrer should receive rewards");
        assertEq(contribution, 1.4 * 10**18, "Referrer contribution should be 1.4e18");
    }
    
    // ============ 等级系统与USDT提现测试 ============
    
    function testLevelUpgradeAndWithdrawUSDT() public {
        // 1. 建立推荐关系
        vm.prank(user2);
        dapp.register(user1);
        
        // 2. user2 交互8次，使 user1 贡献值达到 V1
        // 每次交互，user1 获得 1.4e18 贡献值
        // V1 需要 10e18 贡献值，所以需要 10/1.4 = 7.14 -> 8次
        uint256 startTime = block.timestamp;
        for (uint256 i = 0; i < 8; i++) {
            vm.warp(startTime + i * 12 hours);
            vm.prank(user2);
            dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        }
        
        // 3. 手动更新 user1 等级
        vm.prank(user1);
        dapp.updateLevel();
        
        // 4. 验证等级
        (, , , uint256 contribution, , uint8 level, , , , , ) = dapp.getUserInfo(user1);
        assertGe(contribution, 10 * 10**18, "Should have at least 10e18 contribution");
        assertEq(level, 1, "Should be V1");
        
        // 5. 领取 V1 奖励
        vm.prank(user1);
        dapp.claimLevelReward(1);
        
        // 6. 验证奖励状态
        (, , , , , , uint256 pendingUSDT, , uint256 totalLevelBGP, , ) = dapp.getUserInfo(user1);
        assertEq(totalLevelBGP, 200 * 10**18, "Should have 200 BGP reward");
        assertEq(pendingUSDT, 1 * 10**5, "Should have 0.1 USDT pending"); // V1奖励 0.1 USDT (100000)
        
        // 7. 此时提现应失败（未达到最低提现额）
        vm.prank(user1);
        vm.expectRevert("Insufficient USDT balance");
        dapp.withdrawUSDT();
        
        // 8. 继续交互，达到 V5，累计USDT奖励超过10U
        // V1-V4 USDT奖励: 0.1 + 0.5 + 1 + 5 = 6.6 USDT
        // V5 USDT奖励: 20 USDT. 达到V5时总奖励 26.6 USDT
        // V5 需要 3000e18 贡献值. 当前 8 * 1.4e18 = 11.2e18
        // ** 注意: 循环次数太多会导致测试超时/gas耗尽，这里我们直接用 cheat code 修改贡献值 **
        vm.prank(owner);
        dapp.setContribution(user1, 3000 * 10**18);

        // 9. 更新等级到 V5
        vm.prank(user1);
        dapp.updateLevel();
        (, , , , , uint8 newLevel, , , , , ) = dapp.getUserInfo(user1);
        assertEq(newLevel, 5, "Should be V5");
        
        // 10. 领取 V2, V3, V4, V5 奖励
        uint256 expectedPendingUSDT = 1 * 10**5; // V1
        vm.prank(user1);
        dapp.claimLevelReward(2); expectedPendingUSDT += 5 * 10**5;
        dapp.claimLevelReward(3); expectedPendingUSDT += 1 * 10**6;
        dapp.claimLevelReward(4); expectedPendingUSDT += 5 * 10**6;
        dapp.claimLevelReward(5); expectedPendingUSDT += 20 * 10**6;
        
        // 11. 验证待提现USDT
        (, , , , , , uint256 finalPendingUSDT, , , , ) = dapp.getUserInfo(user1);
        assertEq(finalPendingUSDT, expectedPendingUSDT, "Pending USDT should be accumulated"); // 26.6 USDT
        
        // 12. 成功提现 USDT
        uint256 usdtBalanceBefore = usdtToken.balanceOf(user1);
        vm.prank(user1);
        dapp.withdrawUSDT();
        uint256 usdtBalanceAfter = usdtToken.balanceOf(user1);
        
        // 13. 验证提现结果
        assertEq(usdtBalanceAfter - usdtBalanceBefore, expectedPendingUSDT, "Should withdraw correct USDT amount");
        (, , , , , , uint256 remainingPending, uint256 totalWithdrawn, , , ) = dapp.getUserInfo(user1);
        assertEq(remainingPending, 0, "Pending USDT should be zero after withdrawal");
        assertEq(totalWithdrawn, expectedPendingUSDT, "Total withdrawn should be updated");
    }
    
    // ============ 管理员功能测试 ============
    
    function testPauseAndUnpause() public {
        dapp.pause();
        
        vm.prank(user1);
        vm.expectRevert(bytes("EnforcedPause()"));
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        dapp.unpause();
        
        vm.prank(user1);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        assertEq(bgpToken.balanceOf(user1), DAILY_BGP_REWARD, "Should work after unpause");
    }
    
    function testEmergencyWithdraw() public {
        // ETH
        uint256 ownerBalanceBefore = owner.balance;
        dapp.emergencyWithdraw();
        assertEq(owner.balance, ownerBalanceBefore, "Should withdraw 0 ETH");

        // USDT
        uint256 dappUSDT = usdtToken.balanceOf(address(dapp));
        uint256 ownerUSDTBefore = usdtToken.balanceOf(owner);
        dapp.emergencyWithdrawToken(address(usdtToken));
        assertEq(usdtToken.balanceOf(owner), ownerUSDTBefore + dappUSDT, "Should withdraw all USDT");
    }

    // ============ 黑名单测试 ============
    
    function testIPLimitBlacklist() public {
        address[] memory users = new address[](15);
        for (uint256 i = 0; i < 15; i++) {
            users[i] = makeAddr(string(abi.encodePacked("testUser", i)));
            vm.deal(users[i], 10 ether);
        }
        
        // 前15个地址交互，第15次交互会触发黑名单
        for (uint256 i = 0; i < 15; i++) {
            vm.prank(users[i]);
            dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        }
        
        // 验证IP和用户已被拉黑
        assertTrue(dapp.ipBlacklisted(IP_HASH_1), "IP should be blacklisted");
        assertTrue(dapp.isBlacklisted(users[0]), "First user should be blacklisted");
        assertTrue(dapp.isBlacklisted(users[14]), "15th user should be blacklisted");
        
        // 换个新用户用被封禁的IP，应该失败
        address newUser = makeAddr("newUser");
        vm.deal(newUser, 1 ether);
        vm.prank(newUser);
        vm.expectRevert("IP is blacklisted");
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        // 被封禁的用户换IP，也应该失败
        vm.prank(users[0]);
        vm.expectRevert("Address is blacklisted");
        dapp.interact{value: INTERACTION_COST}(IP_HASH_2);
        
        // 7. 此时提现应失败（未达到最低提现额）
        vm.prank(user1);
        vm.expectRevert("Insufficient USDT balance");
        dapp.withdrawUSDT();
        
        // 8. 继续交互，达到 V5，累计USDT奖励超过10U
        // V1-V4 USDT奖励: 0.1 + 0.5 + 1 + 5 = 6.6 USDT
        // V5 USDT奖励: 20 USDT. 达到V5时总奖励 26.6 USDT
        // V5 需要 3000e18 贡献值. 当前 8 * 1.4e18 = 11.2e18
        // 还需要 (3000 - 11.2) / 1.4 = 2134.8 -> 2135 次交互
        // for (uint256 i = 8; i < 2135 + 8; i++) {
        //     vm.warp(startTime + i * 12 hours);
        //     vm.prank(user2);
        //     dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        // }
        // ** 注意: 循环次数太多会导致测试超时/gas耗尽，这里我们直接用 cheat code 修改贡献值 **
        vm.prank(owner);
        dapp.setContribution(user1, 3000 * 10**18);

        // 9. 更新等级到 V5
        vm.prank(user1);
        dapp.updateLevel();
        (, , , , , uint8 newLevel, , , , , ) = dapp.getUserInfo(user1);
        assertEq(newLevel, 5, "Should be V5");
        
        // 10. 领取 V2, V3, V4, V5 奖励
        uint256 expectedPendingUSDT = 0.1 * 10**6; // V1
        vm.prank(user1);
        dapp.claimLevelReward(2); expectedPendingUSDT += 0.5 * 10**6;
        dapp.claimLevelReward(3); expectedPendingUSDT += 1 * 10**6;
        dapp.claimLevelReward(4); expectedPendingUSDT += 5 * 10**6;
        dapp.claimLevelReward(5); expectedPendingUSDT += 20 * 10**6;
        
        // 11. 验证待提现USDT
        (, , , , , , uint256 finalPendingUSDT, , , , ) = dapp.getUserInfo(user1);
        assertEq(finalPendingUSDT, expectedPendingUSDT, "Pending USDT should be accumulated"); // 26.6 USDT
        
        // 12. 成功提现 USDT
        uint256 usdtBalanceBefore = usdtToken.balanceOf(user1);
        vm.prank(user1);
        dapp.withdrawUSDT();
        uint256 usdtBalanceAfter = usdtToken.balanceOf(user1);
        
        // 13. 验证提现结果
        assertEq(usdtBalanceAfter - usdtBalanceBefore, expectedPendingUSDT, "Should withdraw correct USDT amount");
        (, , , , , , uint256 remainingPending, uint256 totalWithdrawn, , , ) = dapp.getUserInfo(user1);
        assertEq(remainingPending, 0, "Pending USDT should be zero after withdrawal");
        assertEq(totalWithdrawn, expectedPendingUSDT, "Total withdrawn should be updated");
    }
    
    // ============ 管理员功能测试 ============
    
    function testPauseAndUnpause() public {
        dapp.pause();
        
        vm.prank(user1);
        vm.expectRevert("Pausable: paused");
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        dapp.unpause();
        
        vm.prank(user1);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        assertEq(bgpToken.balanceOf(user1), DAILY_BGP_REWARD, "Should work after unpause");
    }
    
    function testEmergencyWithdraw() public {
        // ETH
        uint256 ownerBalanceBefore = owner.balance;
        dapp.emergencyWithdraw();
        assertEq(owner.balance, ownerBalanceBefore, "Should withdraw 0 ETH");

        // USDT
        uint256 dappUSDT = usdtToken.balanceOf(address(dapp));
        uint256 ownerUSDTBefore = usdtToken.balanceOf(owner);
        dapp.emergencyWithdrawToken(address(usdtToken));
        assertEq(usdtToken.balanceOf(owner), ownerUSDTBefore + dappUSDT, "Should withdraw all USDT");
    }

    // ============ 黑名单测试 ============
    
    function testIPLimitBlacklist() public {
        address[] memory users = new address[](16);
        for (uint256 i = 0; i < 16; i++) {
            users[i] = makeAddr(string(abi.encodePacked("testUser", i)));
            vm.deal(users[i], 10 ether);
        }
        
        for (uint256 i = 0; i < 15; i++) {
            vm.prank(users[i]);
            dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        }
        
        // 第16个地址交互时，IP和前15个地址都被封禁
        vm.prank(users[15]);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);

        assertTrue(dapp.ipBlacklisted(IP_HASH_1), "IP should be blacklisted");
        assertTrue(dapp.isBlacklisted(users[0]), "First user should be blacklisted");
        assertTrue(dapp.isBlacklisted(users[14]), "15th user should be blacklisted");
        assertTrue(dapp.isBlacklisted(users[15]), "16th user should be blacklisted");
        
        // 换个新用户用被封禁的IP，应该失败
        vm.prank(user3);
        vm.expectRevert("IP is blacklisted");
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        // 被封禁的用户换IP，也应该失败
        vm.prank(users[0]);
        vm.expectRevert("Address is blacklisted");
        dapp.interact{value: INTERACTION_COST}(IP_HASH_2);
    }
    
    function testBlacklistedCannotTransferBGP() public {
        vm.prank(user1);
        dapp.interact{value: INTERACTION_COST}(IP_HASH_1);
        
        dapp.blacklistAddress(user1, "Test");
        
        vm.prank(user1);
        vm.expectRevert("Sender is blacklisted");
        bgpToken.transfer(user2, 100 * 10**18);
    }
}

