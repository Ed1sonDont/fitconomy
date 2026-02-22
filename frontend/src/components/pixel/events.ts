/**
 * Expanded event system: 150+ events across multiple categories.
 * Events are context-aware (weather, time of day, cat presence, etc.)
 */

import type { Weather, TimeOfDay } from "./day-night";

export interface GameEvent {
  id: number;
  text: string;
  category: EventCategory;
  goldReward?: number;
  isRare?: boolean;
  timestamp: number;
}

export type EventCategory =
  | "gossip"
  | "chef"
  | "waiter"
  | "cat"
  | "weather"
  | "time"
  | "rare"
  | "achievement"
  | "upgrade"
  | "system";

let eventIdCounter = 0;

// ─── Event Pools ───────────────────────────────────────────────────

const GOSSIP_EVENTS = [
  "两位顾客正在热烈讨论今天的天气",
  "角落的情侣偷偷地交换了一个眼神",
  "一位老顾客说：这是我吃过最好的餐厅！",
  "有人在争论到底是可乐好喝还是雪碧好喝",
  "一位顾客正在给食物拍照发朋友圈",
  "隔壁桌在讨论最近的电视剧",
  "有顾客偷偷把菜分享给朋友",
  "一个小朋友趴在桌上画画",
  "一位顾客称赞了装修风格",
  "邻桌发现他们点了一样的菜",
  "两位顾客因为谁先来的争执不休",
  "有人在餐厅里大声打电话…",
  "一位顾客在纸巾上写情书",
  "角落的大叔又来了，他每天都来",
  "几个年轻人在自拍，笑得很开心",
  "一位女士在认真研究菜单",
  "有个小孩把筷子当鼓槌在敲碗",
  "门口传来一阵欢快的笑声",
  "两位老朋友在餐厅偶遇了！",
  "顾客A小声对B说：他们家的秘方太绝了",
  "有人在餐厅里看书，好惬意",
  "一群同事在庆祝升职加薪",
  "有顾客把食物打包带走给家人",
  "窗边的女孩在写日记",
  "一位老奶奶带着孙子来吃饭",
  "两位白领在讨论项目方案",
  "有人说这里的氛围比星巴克还好",
  "一位画家在速写餐厅的场景",
  "几个学生在分享考试复习资料",
  "一位顾客问服务员有没有WiFi",
  "隔壁桌的蛋糕看起来好好吃！",
  "有人带了一束花来约会",
  "一位外国友人在用翻译软件点菜",
  "某顾客：这个餐厅让我想起了老家的味道",
  "一位程序员在角落里敲代码，点了三杯咖啡",
  "两位妈妈在交流育儿经验",
  "有人在研究今天的股票行情",
  "门口排队的人说：等再久也值得！",
  "一位小姐姐发了条点评：五颗星好评！",
  "几个老人在下棋，等菜的时间也不无聊",
];

const CHEF_EVENTS = [
  "厨师正在精心调配酱汁的比例",
  "厨师尝了一口汤，满意地点点头",
  "厨师表演了一个花式颠锅！",
  "厨师正在用秘制配方烹饪",
  "新鲜食材到货了，厨师开心地检查",
  "厨师在尝试一道新菜品",
  "厨师切菜的速度快得像忍者！",
  "厨房里传来阵阵香气",
  "厨师往汤里加了一点点魔法（调味料）",
  "厨师自言自语：火候差不多了...",
  "厨师今天心情很好，哼着小曲做菜",
  "厨师正在练习拉面的技术",
  "厨师向学徒展示了独门绝技",
  "厨房里冒出了一股青烟…厨师说：这是正常的！",
  "厨师精心摆盘，像在创作艺术品",
  "厨师正在研究一本古老的食谱",
  "调料瓶排列整齐，厨师有轻微强迫症",
  "厨师发现了一个完美的食材搭配！",
  "厨师小声说：今天这道菜是我的巅峰之作",
  "后厨传来锅碗瓢盆的交响乐",
  "厨师在比较两种橄榄油的区别",
  "厨师自豪地说：这道菜传承了三代人",
  "新的烤箱到了！厨师迫不及待想试试",
  "厨师认真地写下了今天的每日特供",
  "厨师对自己的作品拍了张照：记录灵感",
];

const WAITER_EVENTS = [
  "服务员微笑着为顾客倒水",
  "服务员端着满满一托盘菜品稳稳走过",
  "服务员贴心地为顾客换了一双新筷子",
  "服务员推荐了今日特供，顾客连连点头",
  "服务员正在整理桌面，擦得锃亮",
  "服务员帮小朋友拿了一个加高垫",
  "服务员快步穿梭在餐桌之间",
  "服务员和常客打招呼：老样子？",
  "服务员不小心差点打翻杯子，还好稳住了！",
  "服务员温柔地对老奶奶说：慢慢来，不着急",
  "服务员在帮顾客拍合照",
  "服务员递上了热毛巾：请慢用",
  "服务员为窗边的客人拉开了窗帘",
  "服务员收到了一张手写的感谢纸条",
  "服务员跑前跑后，今天特别忙！",
  "服务员帮生日的顾客端上了蛋糕",
  "服务员在给新来的实习生做培训",
  "服务员今天穿了新围裙，看起来精神多了",
  "服务员发现一位常客换了新发型",
  "服务员轻声问：这道菜合您口味吗？",
];

const CAT_EVENTS = [
  "猫咪跳上了柜台，用大眼睛盯着厨师做菜",
  "猫咪在收银台旁打盹，呼噜声很大",
  "猫咪蹭了蹭一位顾客的腿，顾客开心极了",
  "猫咪追着自己的尾巴转了三圈",
  "猫咪不知从哪抓来一片树叶当玩具",
  "猫咪优雅地跳上窗台，看着窗外发呆",
  "猫咪歪着头看服务员端盘子，眼里满是好奇",
  "猫咪给了一位小朋友一个猫猫拳",
  "猫咪躺在地板最暖和的那一块上晒太阳",
  "一位顾客拍了猫咪的视频发到抖音！",
  "猫咪偷偷闻了闻顾客的食物…被发现了",
  "猫咪的小爪子在桌腿上磨了磨",
  "猫咪把纸团拍来拍去，自己玩得很开心",
  "猫咪和一只苍蝇展开了激烈的追逐战",
  "猫咪打了个哈欠，露出小小的牙齿",
];

const WEATHER_SUNNY = [
  "阳光洒进餐厅，一切都暖洋洋的",
  "窗外阳光明媚，顾客心情特别好",
  "今天天气真好，适合来一顿美味的午餐",
  "阳光透过窗帘洒在桌面上，好温暖",
  "蓝天白云，窗外的风景也是一道菜",
  "晴天的餐厅总是特别热闹",
  "一位顾客说：这么好的天气配好的食物，完美！",
  "阳光把猫咪晒得眯起了眼睛",
];

const WEATHER_CLOUDY = [
  "天空有些阴沉，适合待在温暖的室内",
  "乌云慢慢聚集，但餐厅里依然温馨",
  "多云天气让一切显得格外安静",
  "窗外的云层很厚，像棉花糖一样",
  "有顾客担心会不会下雨",
  "阴天也挡不住美食的香气",
];

const WEATHER_RAINY = [
  "雨水拍打着窗户，餐厅里格外温馨",
  "外面下着雨，顾客们不想走了",
  "雨天配上热汤，简直完美搭配",
  "一位顾客说：下雨天就该在餐厅里待着",
  "雨声和餐厅里的轻音乐混在一起，很治愈",
  "有人忘带伞了，服务员借了一把给他",
  "雨水顺着窗户流下来，像一幅水彩画",
  "外面在下雨，但餐厅里的笑声不断",
];

const WEATHER_SNOWY = [
  "窗外飘起了雪花，好浪漫！",
  "雪天的餐厅特别有气氛",
  "一位顾客堆了个小雪人放在窗台上",
  "雪越下越大，大家都不想出去了",
  "下雪天来一碗热汤，暖到心里",
  "窗外白茫茫一片，但餐厅里暖意融融",
  "有个小朋友趴在窗边数雪花",
];

const TIME_DAWN = [
  "早起的鸟儿有虫吃，早起的顾客有早餐！",
  "清晨的第一缕阳光照进了餐厅",
  "厨师一大早就开始准备食材",
  "早餐时光，咖啡的香气弥漫开来",
  "一位跑步回来的顾客点了份营养早餐",
];

const TIME_DAY = [
  "午餐高峰期到了！餐厅开始忙碌起来",
  "中午的阳光让餐厅格外明亮",
  "午休时间，附近的上班族纷纷涌入",
  "白天的生意总是最好的",
  "下午茶时间到，有人点了甜品",
];

const TIME_DUSK = [
  "夕阳西下，晚餐时间即将到来",
  "黄昏的光线把餐厅染成了金色",
  "傍晚的客人多了起来",
  "灯笼亮了起来，夜晚的餐厅更有味道",
  "日落的景色好美，窗边的位子最抢手",
];

const TIME_NIGHT = [
  "夜色降临，餐厅的灯光显得格外温暖",
  "深夜食堂模式启动！",
  "夜晚的餐厅有一种独特的宁静",
  "月光洒进窗户，好浪漫的氛围",
  "深夜加班的顾客终于来吃宵夜了",
  "夜深了，但美食永不打烊",
  "一位出租车司机匆匆进来吃碗面",
  "凌晨的餐厅只有几位夜猫子顾客",
];

const RARE_EVENTS: { text: string; gold: number }[] = [
  { text: "⭐ 一位美食评论家来访了！他给了极高评价！", gold: 10 },
  { text: "⭐ 一位明星低调地来用餐，被粉丝认出来了！", gold: 8 },
  { text: "⭐ 一对新人选择在这里办婚宴前的品鉴！", gold: 15 },
  { text: "⭐ 旅游杂志记者来拍照，说要推荐你的餐厅！", gold: 12 },
  { text: "⭐ 隔壁店老板带全体员工来聚餐！大单！", gold: 20 },
  { text: "⭐ 一位退休厨师品尝后说：后生可畏！", gold: 8 },
  { text: "⭐ 有人在直播平台推荐了你的餐厅！流量暴增！", gold: 10 },
  { text: "⭐ 一位神秘老人留下了一张古老的菜谱", gold: 5 },
  { text: "⭐ 幸运顾客！第100位顾客获得免单，但你获得了好评！", gold: 8 },
  { text: "⭐ 有慈善组织来谈合作，你的餐厅口碑更好了！", gold: 6 },
];

const ACHIEVEMENT_EVENT_TEMPLATES: Record<string, string> = {
  first_customer: "🎉 成就解锁：开张大吉！你的第一位顾客到了！",
  gold_100: "🎉 成就解锁：财源广进！你已经赚了100金币！",
  gold_500: "🎉 成就解锁：小有身家！500金币到手！",
  gold_1000: "🎉 成就解锁：百万富翁！1000金币！传奇餐厅！",
  full_house: "🎉 成就解锁：满堂红！座无虚席！",
  five_star: "🎉 成就解锁：五星好评！满意度爆表！",
  night_owl: "🎉 成就解锁：深夜食堂！夜猫子们的最爱！",
  signature_dish: "🎉 成就解锁：招牌菜诞生！这道菜已经出名了！",
  cat_unlock: "🎉 成就解锁：猫主子驾到！一只猫咪加入了餐厅！",
  regular_7: "🎉 成就解锁：日理万机！连续7天的努力！",
  customers_50: "🎉 成就解锁：人气餐厅！已服务50位顾客！",
  customers_200: "🎉 成就解锁：网红打卡地！200位顾客！",
  upgrade_5: "🎉 成就解锁：装修狂人！5次升级完成！",
  upgrade_15: "🎉 成就解锁：完美主义者！15次升级！",
  rare_event: "🎉 成就解锁：奇遇连连！你真是个幸运儿！",
  big_tipper: "🎉 成就解锁：大手笔！单次大额收入！",
  events_100: "🎉 成就解锁：故事收集者！100个事件！",
};

const UPGRADE_EVENTS: Record<string, string> = {
  stove_level: "🔧 灶台升级了！做饭速度提升！厨师很满意",
  chef_count: "🔧 新厨师入职了！厨房更热闹了",
  table_count: "🔧 新桌椅搬进来了！可以接待更多顾客了",
  table_level: "🔧 桌椅升级了！顾客坐得更舒适了",
  waiter_count: "🔧 新服务员到岗！服务效率提升",
  wall_decor: "🔧 新的墙面装饰挂好了！餐厅更漂亮了",
  floor_level: "🔧 地板翻新完成！焕然一新！",
  cat_mascot: "🔧 一只可爱的猫咪加入了餐厅大家庭！喵～",
  takeout_window: "🔧 外卖窗口开通了！被动收入开始了！",
};

// ─── Event Generation ──────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateEvent(
  weather: Weather,
  timeOfDay: TimeOfDay,
  hasCat: boolean,
): GameEvent {
  const roll = Math.random();
  let text: string;
  let category: EventCategory;
  let goldReward: number | undefined;
  let isRare = false;

  if (roll < 0.02) {
    // 2% rare event
    const rare = pick(RARE_EVENTS);
    text = rare.text;
    category = "rare";
    goldReward = rare.gold;
    isRare = true;
  } else if (roll < 0.12 && hasCat) {
    text = pick(CAT_EVENTS);
    category = "cat";
    if (Math.random() < 0.2) goldReward = 2; // Cat tip event
  } else if (roll < 0.25) {
    // Weather event
    switch (weather) {
      case "sunny": text = pick(WEATHER_SUNNY); break;
      case "cloudy": text = pick(WEATHER_CLOUDY); break;
      case "rainy": text = pick(WEATHER_RAINY); break;
      case "snowy": text = pick(WEATHER_SNOWY); break;
    }
    category = "weather";
  } else if (roll < 0.38) {
    // Time event
    switch (timeOfDay) {
      case "dawn": text = pick(TIME_DAWN); break;
      case "day": text = pick(TIME_DAY); break;
      case "dusk": text = pick(TIME_DUSK); break;
      case "night": text = pick(TIME_NIGHT); break;
    }
    category = "time";
  } else if (roll < 0.55) {
    text = pick(CHEF_EVENTS);
    category = "chef";
  } else if (roll < 0.70) {
    text = pick(WAITER_EVENTS);
    category = "waiter";
  } else {
    text = pick(GOSSIP_EVENTS);
    category = "gossip";
  }

  return {
    id: eventIdCounter++,
    text,
    category,
    goldReward,
    isRare,
    timestamp: Date.now(),
  };
}

export function generateAchievementEvent(achievementId: string): GameEvent | null {
  const text = ACHIEVEMENT_EVENT_TEMPLATES[achievementId];
  if (!text) return null;
  return {
    id: eventIdCounter++,
    text,
    category: "achievement",
    timestamp: Date.now(),
  };
}

export function generateUpgradeEvent(upgradeId: string): GameEvent | null {
  const text = UPGRADE_EVENTS[upgradeId];
  if (!text) return null;
  return {
    id: eventIdCounter++,
    text,
    category: "upgrade",
    timestamp: Date.now(),
  };
}

export function generateSystemEvent(text: string, gold?: number): GameEvent {
  return {
    id: eventIdCounter++,
    text,
    category: "system",
    goldReward: gold,
    timestamp: Date.now(),
  };
}

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  gossip: "#8b8b9e",
  chef: "#ffcc02",
  waiter: "#ef4444",
  cat: "#f5a623",
  weather: "#87ceeb",
  time: "#a78bfa",
  rare: "#ff69b4",
  achievement: "#4ade80",
  upgrade: "#60a5fa",
  system: "#e0d8c0",
};

export const CATEGORY_ICONS: Record<EventCategory, string> = {
  gossip: "💬",
  chef: "👨‍🍳",
  waiter: "🤵",
  cat: "🐱",
  weather: "🌤",
  time: "🕐",
  rare: "⭐",
  achievement: "🏆",
  upgrade: "🔧",
  system: "📢",
};
