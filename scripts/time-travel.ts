import hre from "hardhat";

async function main() {
  // 从环境变量获取时间参数
  const timeArg = process.env.TIME_ARG;
  
  if (!timeArg) {
    console.log("❌ 请提供时间参数");
    console.log("用法示例:");
    console.log("  npm run time 1d    - 快进1天");
    console.log("  npm run time 12h   - 快进12小时");
    console.log("  npm run time 30m   - 快进30分钟");
    console.log("  npm run time 600s  - 快进600秒");
    process.exit(1);
  }

  let seconds = 0;

  // 解析时间参数
  if (timeArg.endsWith('d')) {
    const days = parseInt(timeArg);
    seconds = days * 24 * 60 * 60;
  } else if (timeArg.endsWith('h')) {
    const hours = parseInt(timeArg);
    seconds = hours * 60 * 60;
  } else if (timeArg.endsWith('m')) {
    const minutes = parseInt(timeArg);
    seconds = minutes * 60;
  } else if (timeArg.endsWith('s')) {
    seconds = parseInt(timeArg);
  } else {
    console.log("❌ 无效的时间格式，请使用: d(天), h(小时), m(分钟), s(秒)");
    process.exit(1);
  }

  console.log(`⏰ 时间加速中...`);
  console.log(`📅 快进: ${timeArg} (${seconds} 秒)`);

  try {
    // 获取 ethers 和 network（Hardhat 3.x）
    const { ethers } = await hre.network.connect();
    
    // 获取当前区块时间
    const blockBefore = await ethers.provider.getBlock('latest');
    const timestampBefore = blockBefore!.timestamp;
    const dateBefore = new Date(Number(timestampBefore) * 1000);
    
    console.log(`🕐 当前时间: ${dateBefore.toLocaleString('zh-CN', { timeZone: 'UTC' })} UTC`);

    // 增加区块链时间（直接使用 ethers.provider）
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);

    // 获取新的区块时间
    const blockAfter = await ethers.provider.getBlock('latest');
    const timestampAfter = blockAfter!.timestamp;
    const dateAfter = new Date(Number(timestampAfter) * 1000);

    console.log(`🕐 快进后时间: ${dateAfter.toLocaleString('zh-CN', { timeZone: 'UTC' })} UTC`);
    console.log(`✅ 成功快进 ${timeArg}！`);
    
    // 计算时间差
    const diffSeconds = Number(timestampAfter) - Number(timestampBefore);
    const diffHours = Math.floor(diffSeconds / 3600);
    const diffMinutes = Math.floor((diffSeconds % 3600) / 60);
    const diffSecs = diffSeconds % 60;
    
    console.log(`📊 时间差: ${diffHours}小时 ${diffMinutes}分钟 ${diffSecs}秒 (${diffSeconds}秒)`);
    
  } catch (error) {
    console.error("❌ 时间加速失败:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
