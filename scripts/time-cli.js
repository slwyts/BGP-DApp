const { execSync } = require('child_process');

// 获取命令行参数
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log("❌ 请提供时间参数");
  console.log("用法示例:");
  console.log("  npm run time 1d    - 快进1天");
  console.log("  npm run time 12h   - 快进12小时");
  console.log("  npm run time 30m   - 快进30分钟");
  console.log("  npm run time 600s  - 快进600秒");
  process.exit(1);
}

const timeArg = args[0];

// 设置环境变量并运行 Hardhat 脚本（禁用 Node 警告）
process.env.TIME_ARG = timeArg;
process.env.NODE_NO_WARNINGS = '1';

try {
  execSync('npx hardhat run scripts/time-travel.ts --network localhost', {
    stdio: 'inherit',
    env: { 
      ...process.env, 
      TIME_ARG: timeArg,
      NODE_NO_WARNINGS: '1'
    }
  });
} catch (error) {
  process.exit(1);
}
