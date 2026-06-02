/**
 * 将 bilibili-skin 原始 properties 规范化为 App 可用主题结构。
 * 仅映射：顶栏、底栏、刷新动效、页面背景（其余字段预留后续扩展）。
 */

const TAB_SLOTS = [
  { slot: 'main', label: '首页', fallbackIcon: '🏠' },
  { slot: 'myself', label: '设置', fallbackIcon: '⚙️' },
];

function pick(props, keys) {
  for (const key of keys) {
    const value = props?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function boolish(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function buildGradient(props) {
  const top = pick(props, ['pub_btn_shade_color_top']);
  const bottom = pick(props, ['pub_btn_shade_color_bottom']);
  const second = pick(props, ['color_second_page', 'side_bg_color']);
  if (top && bottom) {
    return `linear-gradient(145deg, ${top} 0%, ${bottom} 45%, #07070d 100%)`;
  }
  if (second) {
    return `linear-gradient(145deg, ${second} 0%, #12122a 55%, #07070d 100%)`;
  }
  return '';
}

function resolveTabIcons(props, assetMap = {}) {
  return TAB_SLOTS.map(({ slot, label, fallbackIcon }) => {
    const iconKey = `tail_icon_${slot}`;
    const activeKey = `tail_icon_selected_${slot}`;
    const icon = assetMap[iconKey] || pick(props, [iconKey]);
    const iconActive = assetMap[activeKey] || pick(props, [activeKey]);
    return {
      id: slot === 'main' ? 'home' : 'settings',
      label,
      icon,
      iconActive,
      fallbackIcon,
    };
  });
}

export function normalizeBilibiliSkin(raw = {}, assetMap = {}) {
  const props = raw.properties || raw.data?.properties || raw.data || raw;
  const id = String(raw.item_id || raw.id || props.ver || '').trim();
  const name = String(raw.name || raw.data?.name || 'B站主题').trim();
  const preview = assetMap.image_preview
    || pick(props, ['image_preview', 'image_cover'])
    || raw.preview
    || '';

  const topBg = assetMap.head_tab_bg
    || assetMap.head_bg
    || assetMap.head_myself_bg
    || pick(props, ['head_tab_bg', 'head_bg', 'head_myself_bg', 'head_myself_squared_bg']);

  const pageBg = assetMap.side_bg
    || pick(props, ['side_bg', 'head_myself_squared_bg', 'image_cover']);

  const tailBg = assetMap.tail_bg || pick(props, ['tail_bg']);

  const tabInactive = pick(props, ['tail_color']) || '#9898a6';
  const tabActive = pick(props, ['tail_color_selected', 'color']) || '#ffffff';

  return {
    version: 1,
    source: 'bilibili-skin',
    id,
    name,
    preview,
    colors: {
      text: pick(props, ['color']) || '#f5f5f7',
      accent: tabActive,
      tabBg: tabInactive,
      tabActive,
      pubTop: pick(props, ['pub_btn_shade_color_top']),
      pubBottom: pick(props, ['pub_btn_shade_color_bottom']),
      secondPage: pick(props, ['color_second_page', 'side_bg_color']),
    },
    topNav: {
      backgroundImage: topBg,
      gradient: buildGradient(props),
      meshColor: pick(props, ['color_second_page', 'side_bg_color']) || '',
    },
    tabBar: {
      backgroundImage: tailBg,
      inactiveColor: tabInactive,
      activeColor: tabActive,
      animateIcons: boolish(pick(props, ['tail_icon_ani'])),
      animateMode: pick(props, ['tail_icon_ani_mode']) || 'once',
      tabs: resolveTabIcons(props, assetMap),
    },
    refresh: {
      enabled: true,
      mode: pick(props, ['head_myself_mp4_play', 'tail_icon_ani_mode']) || 'once',
      icon: assetMap.tail_icon_main
        || pick(props, ['tail_icon_main', 'tail_icon_dynamic'])
        || pick(props, ['tail_icon_selected_main']),
    },
    pageBackground: {
      image: pageBg,
    },
    rawMeta: {
      colorMode: pick(props, ['color_mode']),
      packageUrl: pick(props, ['package_url']) || raw.package_url || '',
    },
  };
}

export function isSkinActive(theme) {
  return Boolean(theme?.source === 'bilibili-skin' && (theme.name || theme.id));
}
