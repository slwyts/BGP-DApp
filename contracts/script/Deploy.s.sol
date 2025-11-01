// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/BGPToken.sol";
import "../src/BelaChainDApp.sol";

/**
 * @title DeployScript
 * @dev 部署 BelaChain DApp 的 Forge 脚本
 * 
 * 部署步骤：
 * 1. 部署 BGPToken 合约
 * 2. 部署 BelaChainDApp 主合约
 * 3. 将 BGPToken 的 minter 权限授予 BelaChainDApp
 * 4. 将 BGPToken 的 ownership 转移到安全地址
 * 
 * 使用方法:
 * forge script script/Deploy.s.sol:DeployScript --rpc-url <your_rpc_url> --broadcast --verify
 */
contract DeployScript is Script {
    // 部署配置（根据实际情况修改）
    address public constant TREASURY = address(0); // TODO: 设置实际的资金接收地址
    address public constant FINAL_OWNER = address(0); // TODO: 设置最终的 owner 地址（多签钱包）
    
    function run() external {
        // 从环境变量获取私钥
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        console.log("Treasury address:", TREASURY);
        console.log("Final owner address:", FINAL_OWNER);
        
        // 检查配置
        require(TREASURY != address(0), "Treasury address not set");
        require(FINAL_OWNER != address(0), "Final owner address not set");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. 部署 BGPToken
        console.log("\n=== Deploying BGPToken ===");
        BGPToken bgpToken = new BGPToken();
        console.log("BGPToken deployed at:", address(bgpToken));
        console.log("Total supply:", bgpToken.totalSupply() / 1e18, "BGP");
        
        // 2. 部署 BelaChainDApp
        console.log("\n=== Deploying BelaChainDApp ===");
        BelaChainDApp dapp = new BelaChainDApp(
            address(bgpToken),
            payable(TREASURY)
        );
        console.log("BelaChainDApp deployed at:", address(dapp));
        
        // 3. 授权 BelaChainDApp 为 BGPToken 的 minter
        console.log("\n=== Setting up permissions ===");
        bgpToken.setMinter(address(dapp), true);
        console.log("Granted minter role to BelaChainDApp");
        
        // 4. 设置黑名单检查器
        bgpToken.setBlacklistChecker(address(dapp));
        console.log("Set blacklist checker to BelaChainDApp");
        
        // 5. 转移 BGPToken ownership
        bgpToken.transferOwnership(FINAL_OWNER);
        console.log("Transferred BGPToken ownership to:", FINAL_OWNER);
        
        // 6. 转移 BelaChainDApp ownership
        dapp.transferOwnership(FINAL_OWNER);
        console.log("Transferred BelaChainDApp ownership to:", FINAL_OWNER);
        
        vm.stopBroadcast();
        
        // 输出部署信息
        console.log("\n=== Deployment Summary ===");
        console.log("BGPToken:", address(bgpToken));
        console.log("BelaChainDApp:", address(dapp));
        console.log("Treasury:", TREASURY);
        console.log("Owner:", FINAL_OWNER);
        console.log("\nNext steps:");
        console.log("1. Verify contracts on block explorer");
        console.log("2. Update frontend with contract addresses");
        console.log("3. Test all functions on testnet");
        console.log("4. Set up monitoring and alerts");
    }
}
