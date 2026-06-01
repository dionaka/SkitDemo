/** 短剧类型 → 图生图风格前缀 */
const DRAMA_GENRES = [
  { id: 'auto', label: '自动推断', style: '' },
  { id: 'urban', label: '都市情感', style: '现代都市短剧风格，写实摄影，霓虹与室内光影' },
  { id: 'ancient', label: '古装仙侠', style: '中国古装短剧风格，汉服配饰，宫殿或江湖场景' },
  { id: 'suspense', label: '悬疑推理', style: '悬疑短剧风格，低饱和冷色调，阴影与悬念氛围' },
  { id: 'sweet', label: '甜宠恋爱', style: '甜宠短剧风格，暖色调，柔和光线，浪漫亲密氛围' },
  { id: 'revenge', label: '逆袭复仇', style: '逆袭爽剧风格，高对比光影，霸气对峙，戏剧化构图' },
  { id: 'action', label: '动作追车', style: '动作短剧风格，动态模糊，速度感，紧张追逐场面' },
];

const GENRE_KEYWORDS = [
  { id: 'ancient', words: ['古装', '仙侠', '宫廷', '皇上', '太子', '江湖'] },
  { id: 'sweet', words: ['甜', '恋爱', '壁咚', '撒糖', '宠'] },
  { id: 'suspense', words: ['悬疑', '推理', '凶手', '真相', '密室'] },
  { id: 'revenge', words: ['复仇', '逆袭', '打脸', '归来', '太奶奶', '驾到'] },
  { id: 'action', words: ['追', '车', '打', '战', '逃'] },
  { id: 'urban', words: ['都市', '总裁', '豪门', '职场'] },
];

function inferGenreId(seriesTitle = '', videoTitle = '', branchTitle = '') {
  const text = `${seriesTitle}${videoTitle}${branchTitle}`;
  for (const rule of GENRE_KEYWORDS) {
    if (rule.words.some((w) => text.includes(w))) {
      return rule.id;
    }
  }
  return 'urban';
}

function resolveGenreStyle(genreId, seriesTitle, videoTitle, branchTitle) {
  const resolvedId = genreId === 'auto'
    ? inferGenreId(seriesTitle, videoTitle, branchTitle)
    : genreId;
  const genre = DRAMA_GENRES.find((g) => g.id === resolvedId) || DRAMA_GENRES.find((g) => g.id === 'urban');
  return { genreId: resolvedId, style: genre.style, label: genre.label };
}

/**
 * 组装 Seedream 图生图 prompt（参考图为当前短剧截帧）
 */
function buildBranchImagePrompt({
  dramaGenre = 'auto',
  seriesTitle = '',
  videoTitle = '',
  branchTitle = '',
  optionLabel = '',
  optionDesc = '',
  narration = '',
  imagePrompt = '',
  hasReferenceFrame = true,
}) {
  const { style, label } = resolveGenreStyle(dramaGenre, seriesTitle, videoTitle, branchTitle);

  const outcome = imagePrompt
    || `${optionDesc || narration || optionLabel}`;

  const parts = hasReferenceFrame
    ? [
      '基于参考图（当前短剧画面）进行图生图',
      '保持参考图中人物外貌、服装、场景与短剧画风一致',
      style,
      `短剧《${seriesTitle || '未命名'}》${videoTitle ? ` ${videoTitle}` : ''}`,
      `分支情境：${branchTitle}，观众选择「${optionLabel}」`,
      `生成选择后的下一瞬间画面：${outcome}`,
      '竖屏短剧关键帧，电影感，无文字无水印',
    ]
    : [
      style,
      `短剧《${seriesTitle || '未命名'}》分支插图`,
      `${branchTitle}，选项「${optionLabel}」：${outcome}`,
      '竖屏短剧关键帧，无文字无水印',
    ];

  return {
    prompt: parts.filter(Boolean).join('。'),
    genre_label: label,
    mode: hasReferenceFrame ? 'i2i' : 't2i',
  };
}

module.exports = {
  DRAMA_GENRES,
  inferGenreId,
  resolveGenreStyle,
  buildBranchImagePrompt,
};
