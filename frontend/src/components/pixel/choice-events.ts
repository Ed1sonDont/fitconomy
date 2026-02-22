/**
 * Choice event system: interactive events with multiple options and probabilistic outcomes.
 * Part of the roguelike layer.
 */

export type ChoiceEventRarity = "common" | "rare" | "legendary";

export interface ChoiceOutcome {
  description: string;
  probability: number;
  goldDelta: number;
  satisfactionDelta: number;
  reputationDelta: number;
  special?: string;
}

export interface ChoiceOption {
  label: string;
  description: string;
  outcomes: ChoiceOutcome[];
  requiresCat?: boolean;
}

export interface ChoiceEvent {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: ChoiceEventRarity;
  options: ChoiceOption[];
}

export interface ChoiceResult {
  choiceIndex: number;
  outcome: ChoiceOutcome;
  eventId: string;
}

export interface ChoiceEventState {
  encountered: string[];
  totalChoicesMade: number;
  legendaryCount: number;
}

function resolveOutcome(option: ChoiceOption): ChoiceOutcome {
  const roll = Math.random();
  let cumulative = 0;
  for (const outcome of option.outcomes) {
    cumulative += outcome.probability;
    if (roll <= cumulative) return outcome;
  }
  return option.outcomes[option.outcomes.length - 1];
}

export function makeChoice(event: ChoiceEvent, optionIndex: number): ChoiceResult {
  const option = event.options[optionIndex];
  const outcome = resolveOutcome(option);
  return { choiceIndex: optionIndex, outcome, eventId: event.id };
}

const CHOICE_EVENTS: ChoiceEvent[] = [
  {
    id: "mystery_cat",
    title: "神秘黑猫",
    description: "一位神秘的黑猫出现在餐厅门口，它穿着小披风，眼神深邃...",
    icon: "🐈‍⬛",
    rarity: "rare",
    options: [
      {
        label: "热情邀请进来用餐",
        description: "也许是贵宾呢？",
        outcomes: [
          { description: "原来是美食评论家！写了一篇好评！", probability: 0.6, goldDelta: 8, satisfactionDelta: 10, reputationDelta: 5 },
          { description: "是个骗吃骗喝的...白吃了一顿", probability: 0.3, goldDelta: -3, satisfactionDelta: -5, reputationDelta: -2 },
          { description: "竟然是猫界传奇厨师！教了你一道秘方！", probability: 0.1, goldDelta: 15, satisfactionDelta: 20, reputationDelta: 10, special: "secret_recipe" },
        ],
      },
      {
        label: "礼貌地说今天满座了",
        description: "安全第一",
        outcomes: [
          { description: "黑猫点了点头，转身离去", probability: 1.0, goldDelta: 0, satisfactionDelta: 0, reputationDelta: 0 },
        ],
      },
      {
        label: "让吉祥猫去迎接",
        description: "猫咪之间自有语言",
        requiresCat: true,
        outcomes: [
          { description: "两只猫一见如故！黑猫成了常客，带来大量回头客", probability: 0.8, goldDelta: 10, satisfactionDelta: 15, reputationDelta: 8 },
          { description: "两只猫互相瞪了半天...然后一起打盹了", probability: 0.2, goldDelta: 2, satisfactionDelta: 5, reputationDelta: 1 },
        ],
      },
    ],
  },
  {
    id: "food_truck",
    title: "流动餐车",
    description: "一辆豪华的食物卡车停在了你的餐厅门口，车主提出合作方案...",
    icon: "🚚",
    rarity: "common",
    options: [
      {
        label: "合作！共享客源",
        description: "一起做大蛋糕",
        outcomes: [
          { description: "合作愉快！双方客流都增加了", probability: 0.7, goldDelta: 5, satisfactionDelta: 5, reputationDelta: 3 },
          { description: "餐车的食物太好吃了，抢走了你的客人...", probability: 0.3, goldDelta: -4, satisfactionDelta: -5, reputationDelta: -2 },
        ],
      },
      {
        label: "拒绝合作",
        description: "这是我的地盘",
        outcomes: [
          { description: "餐车走了，一切照旧", probability: 0.8, goldDelta: 0, satisfactionDelta: 0, reputationDelta: 0 },
          { description: "餐车在隔壁开了！客人被分流了", probability: 0.2, goldDelta: -2, satisfactionDelta: 0, reputationDelta: -1 },
        ],
      },
    ],
  },
  {
    id: "stray_kitten",
    title: "流浪小猫",
    description: "一只瘦弱的小猫咪在门口喵喵叫，看起来很饿...",
    icon: "🐱",
    rarity: "common",
    options: [
      {
        label: "给它准备一份猫粮",
        description: "花费2金币",
        outcomes: [
          { description: "小猫吃饱了开心地蹭你的腿！顾客们被感动了", probability: 0.7, goldDelta: -2, satisfactionDelta: 15, reputationDelta: 5 },
          { description: "小猫带来了一群流浪猫朋友...场面有点混乱", probability: 0.2, goldDelta: -2, satisfactionDelta: -5, reputationDelta: 2 },
          { description: "这只猫竟然是富豪家走失的名贵猫！主人重金酬谢！", probability: 0.1, goldDelta: 20, satisfactionDelta: 10, reputationDelta: 10 },
        ],
      },
      {
        label: "轻轻把它赶走",
        description: "餐厅不适合流浪猫",
        outcomes: [
          { description: "小猫走了...有些顾客投来了不赞同的目光", probability: 0.6, goldDelta: 0, satisfactionDelta: -5, reputationDelta: -2 },
          { description: "没关系，小猫找到了其他好心人", probability: 0.4, goldDelta: 0, satisfactionDelta: 0, reputationDelta: 0 },
        ],
      },
    ],
  },
  {
    id: "tv_show",
    title: "美食节目邀请",
    description: "一个电视台打来电话，说想来你的餐厅录制美食节目！",
    icon: "📺",
    rarity: "rare",
    options: [
      {
        label: "欣然接受！",
        description: "这是免费广告啊！",
        outcomes: [
          { description: "节目播出后大受欢迎！餐厅一夜成名！", probability: 0.5, goldDelta: 15, satisfactionDelta: 10, reputationDelta: 15 },
          { description: "录制顺利，不过效果一般", probability: 0.3, goldDelta: 5, satisfactionDelta: 0, reputationDelta: 5 },
          { description: "厨师太紧张翻了车...在电视上丢人了", probability: 0.2, goldDelta: -5, satisfactionDelta: -10, reputationDelta: -8 },
        ],
      },
      {
        label: "婉拒，低调经营",
        description: "酒香不怕巷子深",
        outcomes: [
          { description: "继续专心经营，老顾客们很满意", probability: 1.0, goldDelta: 2, satisfactionDelta: 5, reputationDelta: 1 },
        ],
      },
    ],
  },
  {
    id: "ingredient_deal",
    title: "神秘商人",
    description: "一位戴着斗篷的猫咪商人出现了：「我有一批稀有食材，你要吗？」",
    icon: "🧙",
    rarity: "common",
    options: [
      {
        label: "买下来（-5金币）",
        description: "也许是好东西",
        outcomes: [
          { description: "是极品松露！做出了超级菜品，大赚一笔！", probability: 0.4, goldDelta: 10, satisfactionDelta: 20, reputationDelta: 5 },
          { description: "食材品质不错，今天的菜升级了", probability: 0.4, goldDelta: 0, satisfactionDelta: 10, reputationDelta: 2 },
          { description: "全是快过期的...亏大了", probability: 0.2, goldDelta: -5, satisfactionDelta: -10, reputationDelta: -3 },
        ],
      },
      {
        label: "不了，谢谢",
        description: "不信任来路不明的商人",
        outcomes: [
          { description: "商人耸耸肩走了", probability: 1.0, goldDelta: 0, satisfactionDelta: 0, reputationDelta: 0 },
        ],
      },
    ],
  },
  {
    id: "wedding_party",
    title: "婚礼预约",
    description: "一对猫咪新人想在你的餐厅办婚宴！需要特别准备...",
    icon: "💒",
    rarity: "rare",
    options: [
      {
        label: "全力筹备！（-3金币）",
        description: "一定要办好",
        outcomes: [
          { description: "婚宴圆满成功！新人万分感谢，留下丰厚酬金", probability: 0.7, goldDelta: 15, satisfactionDelta: 25, reputationDelta: 10 },
          { description: "虽然有点小插曲，但总体还不错", probability: 0.25, goldDelta: 5, satisfactionDelta: 5, reputationDelta: 3 },
          { description: "蛋糕塌了...不过新人们很大度地笑了", probability: 0.05, goldDelta: 0, satisfactionDelta: -5, reputationDelta: -1 },
        ],
      },
      {
        label: "推荐他们去更大的场地",
        description: "我们还不够格",
        outcomes: [
          { description: "新人理解，还是来你这里吃了顿便饭", probability: 1.0, goldDelta: 2, satisfactionDelta: 0, reputationDelta: 0 },
        ],
      },
    ],
  },
  {
    id: "food_critic_v2",
    title: "匿名评论家",
    description: "你收到消息：今天有一位匿名美食评论家会来用餐...",
    icon: "🕵",
    rarity: "rare",
    options: [
      {
        label: "全员进入最佳状态！",
        description: "每道菜都要完美",
        outcomes: [
          { description: "评论家被完美的服务征服了！给了满分评价！", probability: 0.5, goldDelta: 12, satisfactionDelta: 20, reputationDelta: 12 },
          { description: "表现中规中矩，评论家给了80分", probability: 0.35, goldDelta: 5, satisfactionDelta: 5, reputationDelta: 3 },
          { description: "太紧张了反而失误，评论家皱了皱眉...", probability: 0.15, goldDelta: -3, satisfactionDelta: -10, reputationDelta: -5 },
        ],
      },
      {
        label: "照常营业，做好自己",
        description: "真金不怕火炼",
        outcomes: [
          { description: "评论家很欣赏你的从容！给了中上评价", probability: 0.6, goldDelta: 5, satisfactionDelta: 10, reputationDelta: 5 },
          { description: "平平无奇的一天", probability: 0.4, goldDelta: 0, satisfactionDelta: 0, reputationDelta: 0 },
        ],
      },
    ],
  },
  {
    id: "charity_event",
    title: "慈善活动",
    description: "社区希望你的餐厅参与慈善晚宴，免费为50位猫咪提供食物",
    icon: "🎗",
    rarity: "common",
    options: [
      {
        label: "义不容辞！（-8金币）",
        description: "回馈社区",
        outcomes: [
          { description: "活动大成功！你的善举被报道了，声望大增！", probability: 0.8, goldDelta: -8, satisfactionDelta: 10, reputationDelta: 15 },
          { description: "虽然花了不少钱，但心里很踏实", probability: 0.2, goldDelta: -8, satisfactionDelta: 5, reputationDelta: 8 },
        ],
      },
      {
        label: "捐一些金币代替",
        description: "出钱不出力（-3金币）",
        outcomes: [
          { description: "社区感谢你的捐助", probability: 1.0, goldDelta: -3, satisfactionDelta: 0, reputationDelta: 3 },
        ],
      },
      {
        label: "抱歉，暂时无力参与",
        description: "经营压力太大了",
        outcomes: [
          { description: "大家表示理解", probability: 0.7, goldDelta: 0, satisfactionDelta: 0, reputationDelta: -1 },
          { description: "有人在背后说你小气...", probability: 0.3, goldDelta: 0, satisfactionDelta: -5, reputationDelta: -3 },
        ],
      },
    ],
  },
  {
    id: "renovation_offer",
    title: "装修公司推销",
    description: "一家装修公司说可以半价帮你翻新餐厅，但需要关门一会儿...",
    icon: "🔨",
    rarity: "common",
    options: [
      {
        label: "好机会！翻新吧（-5金币）",
        description: "花点小钱焕然一新",
        outcomes: [
          { description: "翻新效果惊艳！顾客纷纷称赞！", probability: 0.6, goldDelta: -5, satisfactionDelta: 20, reputationDelta: 8 },
          { description: "马马虎虎，但也比之前好一些", probability: 0.3, goldDelta: -5, satisfactionDelta: 5, reputationDelta: 2 },
          { description: "质量太差了...还不如不翻新", probability: 0.1, goldDelta: -5, satisfactionDelta: -10, reputationDelta: -3 },
        ],
      },
      {
        label: "不用了",
        description: "我自己慢慢升级",
        outcomes: [
          { description: "继续稳扎稳打", probability: 1.0, goldDelta: 0, satisfactionDelta: 0, reputationDelta: 0 },
        ],
      },
    ],
  },
  {
    id: "cat_competition",
    title: "猫咪料理大赛",
    description: "全城猫咪餐厅料理大赛开始报名了！要不要参加？",
    icon: "🏆",
    rarity: "legendary",
    options: [
      {
        label: "报名！一展厨艺！",
        description: "冠军有丰厚奖金",
        outcomes: [
          { description: "恭喜获得冠军！🏆 奖金丰厚，名声大振！", probability: 0.3, goldDelta: 30, satisfactionDelta: 30, reputationDelta: 20 },
          { description: "获得了第三名，不错的成绩！", probability: 0.4, goldDelta: 10, satisfactionDelta: 10, reputationDelta: 8 },
          { description: "第一轮就被淘汰了...但是积累了经验", probability: 0.3, goldDelta: 0, satisfactionDelta: -5, reputationDelta: 2 },
        ],
      },
      {
        label: "这次先观摩",
        description: "下次再参加",
        outcomes: [
          { description: "观摩其他餐厅学到了不少", probability: 1.0, goldDelta: 0, satisfactionDelta: 5, reputationDelta: 1 },
        ],
      },
    ],
  },
  {
    id: "royal_visit",
    title: "皇室猫来访",
    description: "传闻皇室猫今天会微服私访一家餐厅...可能是你的！",
    icon: "👑",
    rarity: "legendary",
    options: [
      {
        label: "全力准备最高规格接待",
        description: "不能有任何闪失（-5金币）",
        outcomes: [
          { description: "皇室猫对你的餐厅赞不绝口！授予皇家认证！", probability: 0.4, goldDelta: 25, satisfactionDelta: 30, reputationDelta: 20, special: "royal_seal" },
          { description: "皇室猫没有来你这里...但准备的食物让其他顾客惊喜", probability: 0.4, goldDelta: 0, satisfactionDelta: 15, reputationDelta: 5 },
          { description: "皇室猫来了但对一道菜有意见...不过总体满意", probability: 0.2, goldDelta: 10, satisfactionDelta: 0, reputationDelta: 5 },
        ],
      },
      {
        label: "做好日常工作就好",
        description: "平常心",
        outcomes: [
          { description: "普通的一天", probability: 0.7, goldDelta: 0, satisfactionDelta: 0, reputationDelta: 0 },
          { description: "皇室猫来了！被你的朴实打动了！", probability: 0.3, goldDelta: 15, satisfactionDelta: 20, reputationDelta: 12 },
        ],
      },
    ],
  },
  {
    id: "delivery_app",
    title: "外卖平台",
    description: "一个外卖平台想合作，抽成30%但保证稳定订单流",
    icon: "📲",
    rarity: "common",
    options: [
      {
        label: "合作！扩大客源",
        description: "虽然抽成高但量大",
        outcomes: [
          { description: "外卖订单源源不断！虽然单价低但赚了不少", probability: 0.7, goldDelta: 8, satisfactionDelta: 0, reputationDelta: 3 },
          { description: "外卖包装问题被差评了...", probability: 0.3, goldDelta: 3, satisfactionDelta: -5, reputationDelta: -2 },
        ],
      },
      {
        label: "拒绝，专注堂食体验",
        description: "品质第一",
        outcomes: [
          { description: "专注让你的堂食更精致了", probability: 1.0, goldDelta: 0, satisfactionDelta: 5, reputationDelta: 2 },
        ],
      },
    ],
  },
  {
    id: "cooking_class",
    title: "烹饪课程",
    description: "有人建议你开设猫咪烹饪课程，增加副业收入",
    icon: "📚",
    rarity: "common",
    options: [
      {
        label: "开班授课！（-3金币）",
        description: "教学相长",
        outcomes: [
          { description: "课程大受欢迎！学生们还成了常客！", probability: 0.6, goldDelta: 7, satisfactionDelta: 10, reputationDelta: 5 },
          { description: "参加的人不多，但也学到了教学经验", probability: 0.3, goldDelta: -1, satisfactionDelta: 0, reputationDelta: 2 },
          { description: "一位学生在课上做出了比你更好吃的菜...尴尬", probability: 0.1, goldDelta: -3, satisfactionDelta: -5, reputationDelta: 1 },
        ],
      },
      {
        label: "暂时不开",
        description: "先专注餐厅本身",
        outcomes: [
          { description: "好的决定，专注让你更强", probability: 1.0, goldDelta: 0, satisfactionDelta: 0, reputationDelta: 0 },
        ],
      },
    ],
  },
  {
    id: "ghost_story",
    title: "闹鬼传闻",
    description: "有顾客说昨晚看到餐厅里有「幽灵猫」...传闻开始扩散",
    icon: "👻",
    rarity: "rare",
    options: [
      {
        label: "趁机办「恐怖主题」晚宴",
        description: "化危为机",
        outcomes: [
          { description: "主题晚宴大受年轻人欢迎！排队到门口！", probability: 0.6, goldDelta: 12, satisfactionDelta: 15, reputationDelta: 8 },
          { description: "吓跑了一些胆小的顾客...", probability: 0.3, goldDelta: -2, satisfactionDelta: -10, reputationDelta: -3 },
          { description: "有只真的野猫从天花板掉下来了！太刺激了！", probability: 0.1, goldDelta: 5, satisfactionDelta: 5, reputationDelta: 5 },
        ],
      },
      {
        label: "辟谣",
        description: "发声明否认",
        outcomes: [
          { description: "谣言很快平息了", probability: 0.8, goldDelta: 0, satisfactionDelta: 0, reputationDelta: 0 },
          { description: "越辟谣越多人关注...不过也带来了客流", probability: 0.2, goldDelta: 3, satisfactionDelta: 0, reputationDelta: -1 },
        ],
      },
    ],
  },
  {
    id: "spice_merchant",
    title: "异域商人",
    description: "一位来自远方的猫咪商人带来了你从未见过的香料...",
    icon: "🧂",
    rarity: "common",
    options: [
      {
        label: "购买异域香料（-4金币）",
        description: "尝试新口味",
        outcomes: [
          { description: "异域风味大受欢迎！成为了新的招牌味道！", probability: 0.5, goldDelta: 6, satisfactionDelta: 15, reputationDelta: 5 },
          { description: "有些顾客喜欢，有些吃不惯", probability: 0.4, goldDelta: 0, satisfactionDelta: 0, reputationDelta: 1 },
          { description: "太辣了！一位顾客被辣哭了...", probability: 0.1, goldDelta: -4, satisfactionDelta: -15, reputationDelta: -3 },
        ],
      },
      {
        label: "只买一点试试（-1金币）",
        description: "保守尝试",
        outcomes: [
          { description: "小量尝试效果不错，下次多买一些", probability: 0.8, goldDelta: 1, satisfactionDelta: 5, reputationDelta: 1 },
          { description: "味道一般般", probability: 0.2, goldDelta: -1, satisfactionDelta: 0, reputationDelta: 0 },
        ],
      },
    ],
  },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function rollChoiceEvent(reputationValue: number): ChoiceEvent | null {
  const baseChance = 0.15 + reputationValue * 0.002;
  if (Math.random() > baseChance) return null;

  const available = CHOICE_EVENTS.filter((e) => {
    if (e.rarity === "legendary" && Math.random() > 0.1) return false;
    if (e.rarity === "rare" && Math.random() > 0.35) return false;
    return true;
  });

  if (available.length === 0) return null;
  return pick(available);
}

export function createChoiceEventState(): ChoiceEventState {
  return { encountered: [], totalChoicesMade: 0, legendaryCount: 0 };
}

export function recordChoice(state: ChoiceEventState, event: ChoiceEvent): void {
  if (!state.encountered.includes(event.id)) {
    state.encountered.push(event.id);
  }
  state.totalChoicesMade++;
  if (event.rarity === "legendary") state.legendaryCount++;
}

export function getAllChoiceEvents(): ChoiceEvent[] {
  return CHOICE_EVENTS;
}

const STORAGE_KEY = "fitconomy_choices";

export function saveChoiceEventState(state: ChoiceEventState, userId?: string): void {
  const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch { /* noop */ }
}

export function loadChoiceEventState(userId?: string): ChoiceEventState {
  const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as ChoiceEventState;
  } catch { /* noop */ }
  return createChoiceEventState();
}
