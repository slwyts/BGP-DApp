export type LevelInfo = {
  v: number
  need: number
  usdt: number
  bgp: number
}

export const LEVELS: LevelInfo[] = [
  { v: 1, need: 10, usdt: 0.1, bgp: 200 },
  { v: 2, need: 50, usdt: 0.5, bgp: 200 },
  { v: 3, need: 100, usdt: 1, bgp: 200 },
  { v: 4, need: 500, usdt: 5, bgp: 2000 },
  { v: 5, need: 3000, usdt: 20, bgp: 8000 },
  { v: 6, need: 10000, usdt: 100, bgp: 10000 },
  { v: 7, need: 30000, usdt: 200, bgp: 30000 },
  { v: 8, need: 50000, usdt: 300, bgp: 50000 },
  { v: 9, need: 100000, usdt: 500, bgp: 100000 },
  { v: 10, need: 300000, usdt: 1000, bgp: 300000 },
  { v: 11, need: 500000, usdt: 2000, bgp: 500000 },
  { v: 12, need: 1000000, usdt: 10000, bgp: 1000000 },
]

/**
 * 根据贡献值计算可达到的最高等级
 */
export function getLevelByContribution(contribution: number): number {
  if (!Number.isFinite(contribution) || contribution <= 0) {
    return 0
  }

  let level = 0
  for (const lv of LEVELS) {
    if (contribution >= lv.need) {
      level = lv.v
    } else {
      break
    }
  }
  return level
}

/**
 * 获取下一个等级的需求信息
 */
export function getNextLevelRequirement(contribution: number): LevelInfo | undefined {
  return LEVELS.find((lv) => contribution < lv.need)
}
