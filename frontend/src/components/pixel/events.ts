/**
 * Random event log generator for the pixel restaurant idle game.
 */

export interface GameEvent {
  id: number;
  time: string;
  text: string;
}

let eventIdCounter = 0;

const GOSSIP_EVENTS = [
  "3号桌的两位客人聊起了健身的话题",
  "有位客人偷偷掏出了手机拍餐厅的装潢",
  "1号桌的情侣在分享甜品，好甜啊~",
  "角落的大叔边吃边哼着小曲",
  "两位阿姨在讨论今天的菜价涨了多少",
  "有个小朋友趴在窗户上往里看",
  "一位客人正在写美食评论",
  "3号桌的客人说这是他吃过最好吃的牛排",
  "有两位客人为了最后一份甜点吵了起来...",
  "隔壁桌的客人在给朋友推荐这家店",
  "一位常客带了新朋友来体验",
  "有个客人在问老板有没有隐藏菜单",
];

const CHEF_EVENTS = [
  "厨师尝试了一道新菜，看起来不错！",
  "厨师今天的手艺特别好，上菜速度飞快",
  "厨师偷偷尝了一口自己做的汤，满意地点点头",
  "厨师正在精心摆盘，像是在创作艺术品",
  "厨师说今天的食材特别新鲜",
  "厨师在厨房里翻炒，火焰窜了好高！",
  "厨师正在认真研究新的菜谱",
  "厨师今天心情不错，给每份菜都加了小装饰",
];

const WAITER_EVENTS = [
  "服务员不小心差点绊了一跤，还好端稳了",
  "服务员给客人推荐了今日特餐",
  "服务员笑着给客人续了杯水",
  "服务员正忙着擦桌子准备迎接下一位客人",
  "服务员动作麻利地收拾了空盘子",
];

const SPECIAL_EVENTS = [
  "一位神秘顾客留下了丰厚的小费就离开了",
  "有个外国游客用手比划着点了餐",
  "门口排起了小队，看来今天生意不错！",
  "一位美食博主正在直播今天的用餐体验",
  "隔壁店的老板来偷师了",
  "有人在门口放了一束花",
  "天花板上的灯泡闪了一下，客人们都抬头看",
  "收银台的猫咪打了个哈欠",
  "橱窗上多了一张\"今日推荐\"的手写小卡",
  "外面下起了小雨，客人们都不想走了",
];

const ALL_POOLS = [
  { pool: GOSSIP_EVENTS, weight: 3 },
  { pool: CHEF_EVENTS, weight: 2 },
  { pool: WAITER_EVENTS, weight: 2 },
  { pool: SPECIAL_EVENTS, weight: 1 },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function generateEvent(): GameEvent {
  const totalWeight = ALL_POOLS.reduce((sum, p) => sum + p.weight, 0);
  let r = Math.random() * totalWeight;
  let text = "";

  for (const { pool, weight } of ALL_POOLS) {
    r -= weight;
    if (r <= 0) {
      text = pickRandom(pool);
      break;
    }
  }

  if (!text) text = pickRandom(GOSSIP_EVENTS);

  return {
    id: ++eventIdCounter,
    time: formatTime(),
    text,
  };
}
