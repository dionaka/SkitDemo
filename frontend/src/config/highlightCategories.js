/** 高光点内容分类（与 backend/src/config/highlightCategories.js 保持一致） */
export const HIGHLIGHT_CATEGORIES = {
  conflict: { label: '冲突', color: '#ff4757' },
  reversal: { label: '反转', color: '#ffa502' },
  sweet: { label: '撒糖', color: '#ff6b81' },
  scene: { label: '名场面', color: '#5352ed' },
  suspense: { label: '悬疑', color: '#7c3aed' },
  funny: { label: '搞笑', color: '#ffc048' },
  touch: { label: '催泪', color: '#74c0fc' },
  rage: { label: '高燃', color: '#ff6348' },
  shock: { label: '震惊', color: '#ffd166' },
  quote: { label: '金句', color: '#20c997' },
};

export const CATEGORY_OPTIONS = Object.entries(HIGHLIGHT_CATEGORIES).map(([value, meta]) => ({
  value,
  label: `${meta.label} ${value}`,
}));

export function getCategoryLabel(id) {
  return HIGHLIGHT_CATEGORIES[id]?.label || id || '高光';
}

export function getCategoryColor(id) {
  return HIGHLIGHT_CATEGORIES[id]?.color || '#5352ed';
}
