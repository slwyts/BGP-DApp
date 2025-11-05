// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/BGPToken.sol";
import "../src/BelaChainDApp.sol";
import "../src/test/MockUSDT.sol";

/**
 * @title DeployScript
 * @dev 部署 BelaChain DApp 的 Forge 脚本
 * 
 * 部署步骤：
 * 1. 部署 BGPToken 合约
 * 2. 部署 MockUSDT 合约 (用于测试网)
 * 3. 部署 BelaChainDApp 主合约
 * 4. 将 BGPToken 的 minter 权限授予 BelaChainDApp
 * 5. 将 BGPToken 的 ownership 转移到安全地址
 * 
 * 使用方法:
 * forge script script/Deploy.s.sol:DeployScript --rpc-url <your_rpc_url> --private-key <your_private_key> --broadcast --verify
 */
contract DeployScript is Script {
    
    function run() external {
        // 从环境变量获取私钥
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // 从环境变量获取地址，如果未设置则使用部署者地址
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        if (treasury == address(0)) {
            treasury = deployer;
        }

        address finalOwner = vm.envAddress("FINAL_OWNER_ADDRESS");
        if (finalOwner == address(0)) {
            finalOwner = deployer;
        }
        
        console.log("Deployer address:", deployer);
        console.log("Treasury address:", treasury);
        console.log("Final owner address:", finalOwner);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. 部署 BGPToken
        console.log("\n=== Deploying BGPToken ===");
        BGPToken bgpToken = new BGPToken();
        console.log("BGPToken deployed at:", address(bgpToken));
        
        // 2. 部署 MockUSDT (6位精度)
        console.log("\n=== Deploying MockUSDT ===");
        MockUSDT usdtToken = new MockUSDT();
        console.log("MockUSDT deployed at:", address(usdtToken));

        // (可选) 给部署者 mint一些测试USDT
        usdtToken.mint(deployer, 1_000_000 * 10**6); // 1,000,000 USDT
        
        // 3. 部署 BelaChainDApp
        console.log("\n=== Deploying BelaChainDApp ===");
        BelaChainDApp dapp = new BelaChainDApp(
            address(bgpToken),
            address(usdtToken),
            payable(treasury)
        );
        console.log("BelaChainDApp deployed at:", address(dapp));

        // (可选) 给DApp合约转一些USDT用于奖励
        usdtToken.transfer(address(dapp), 500_000 * 10**6); // 500,000 USDT
        
        // 4. 授权 BelaChainDApp 为 BGPToken 的 minter
        console.log("\n=== Setting up permissions ===");
        bgpToken.setMinter(address(dapp), true);
        console.log("Granted minter role to BelaChainDApp");
        
        // 5. 设置黑名单检查器
        bgpToken.setBlacklistChecker(address(dapp));
        console.log("Set blacklist checker to BelaChainDApp");
        
        // 6. 转移 BGPToken ownership
        bgpToken.transferOwnership(finalOwner);
        console.log("Transferred BGPToken ownership to:", finalOwner);
        
        // 7. 转移 BelaChainDApp ownership
        dapp.transferOwnership(finalOwner);
        console.log("Transferred BelaChainDApp ownership to:", finalOwner);

        // 8. 转移 MockUSDT ownership
        usdtToken.transferOwnership(finalOwner);
        console.log("Transferred MockUSDT ownership to:", finalOwner);
        
        vm.stopBroadcast();
        
        // 输出部署信息
        console.log("\n=== Deployment Summary ===");
        console.log("BGPToken:", address(bgpToken));
        console.log("MockUSDT:", address(usdtToken));
        console.log("BelaChainDApp:", address(dapp));
        console.log("Treasury:", treasury);
        console.log("Owner:", finalOwner);
        console.log("\nNext steps:");
        console.log("1. Verify contracts on block explorer");
        console.log("2. Update frontend with contract addresses");
        console.log("3. Test all functions on testnet");
    }
}
