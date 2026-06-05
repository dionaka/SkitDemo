/** 高光点内容分类（前后端语义一致，后端为权威定义） */
const HIGHLIGHT_CATEGORIES = {
  conflict: {
    label: '冲突',
    color: '#ff4757',
    aiHint: '激烈争吵、打斗场面、矛盾激化',
  },
  reversal: {
    label: '反转',
    color: '#ffa502',
    aiHint: '剧情突变、身份揭示、出人意料的转折',
  },
  sweet: {
    label: '撒糖',
    color: '#ff6b81',
    aiHint: '甜蜜互动、暧昧场景、情感升温',
  },
  scene: {
    label: '名场面',
    color: '#5352ed',
    aiHint: '经典镜头、高能时刻、值得反复观看',
  },
  suspense: {
    label: '悬疑',
    color: '#7c3aed',
    aiHint: '悬念铺垫、疑云密布、真相揭晓前夕',
  },
  funny: {
    label: '搞笑',
    color: '#ffc048',
    aiHint: '包袱笑点、滑稽场面、轻松整活',
  },
  touch: {
    label: '催泪',
    color: '#74c0fc',
    aiHint: '感动泪点、离别重逢、亲情爱情共鸣',
  },
  rage: {
    label: '高燃',
    color: '#ff6348',
    aiHint: '热血逆袭、打脸复仇、战斗高潮',
  },
  shock: {
    label: '震惊',
    color: '#ffd166',
    aiHint: '劲爆爆料、三观冲击、语出惊人',
  },
  quote: {
    label: '金句',
    color: '#20c997',
    aiHint: '经典台词、可复制语录、共鸣神句',
  },
};

const CATEGORY_IDS = Object.keys(HIGHLIGHT_CATEGORIES);

const ALIAS_MAP = {
  conflict: 'conflict', 冲突: 'conflict', 争吵: 'conflict', 打斗: 'conflict',
  reversal: 'reversal', 反转: 'reversal', 转折: 'reversal', 身份: 'reversal',
  sweet: 'sweet', 撒糖: 'sweet', 甜: 'sweet', 糖: 'sweet', 恋爱: 'sweet',
  scene: 'scene', 名场面: 'scene', 经典: 'scene', 高能: 'scene',
  suspense: 'suspense', 悬疑: 'suspense', 悬念: 'suspense', 谜团: 'suspense',
  funny: 'funny', 搞笑: 'funny', 幽默: 'funny', 笑: 'funny', 整活: 'funny',
  touch: 'touch', 催泪: 'touch', 感动: 'touch', 泪: 'touch', 虐: 'touch',
  rage: 'rage', 高燃: 'rage', 燃: 'rage', 热血: 'rage', 逆袭: 'rage',
  shock: 'shock', 震惊: 'shock', 惊: 'shock', 爆料: 'shock', 炸裂: 'shock',
  quote: 'quote', 金句: 'quote', 台词: 'quote', 语录: 'quote', 神句: 'quote',
};

function normalizeCategory(raw) {
  const key = String(raw || '').trim().toLowerCase();
  if (ALIAS_MAP[key]) return ALIAS_MAP[key];
  if (CATEGORY_IDS.includes(key)) return key;

  const text = String(raw || '');
  if (/冲突|争吵|打|撕/.test(text)) return 'conflict';
  if (/反转|身份|意外|转折/.test(text)) return 'reversal';
  if (/甜|糖|宠|恋爱/.test(text)) return 'sweet';
  if (/名场面|经典|截图|反复/.test(text)) return 'scene';
  if (/悬疑|悬念|疑云|伏笔/.test(text)) return 'suspense';
  if (/搞笑|笑|幽默|整活/.test(text)) return 'funny';
  if (/催泪|感动|泪|虐|离别/.test(text)) return 'touch';
  if (/高燃|燃|热血|逆袭|打脸/.test(text)) return 'rage';
  if (/震惊|惊|爆料|三观/.test(text)) return 'shock';
  if (/金句|台词|语录|神句/.test(text)) return 'quote';
  return 'scene';
}

function buildAiCategoryLines() {
  return CATEGORY_IDS.map(
    (id) => `- ${id}（${HIGHLIGHT_CATEGORIES[id].label}）：${HIGHLIGHT_CATEGORIES[id].aiHint}`,
  ).join('\n');
}

function getCategoryLabel(id) {
  return HIGHLIGHT_CATEGORIES[id]?.label || id || '高光';
}

function getCategoryColor(id) {
  return HIGHLIGHT_CATEGORIES[id]?.color || '#5352ed';
}

module.exports = {
  HIGHLIGHT_CATEGORIES,
  CATEGORY_IDS,
  normalizeCategory,
  buildAiCategoryLines,
  getCategoryLabel,
  getCategoryColor,
};
