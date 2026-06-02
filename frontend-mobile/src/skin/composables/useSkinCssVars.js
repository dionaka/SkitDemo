import { watch, onScopeDispose } from 'vue';
import { useSkinStore } from '../store/skinStore';

function setVar(el, key, value) {
  if (value) el.style.setProperty(key, value);
  else el.style.removeProperty(key);
}

/**
 * 将皮肤主题写入 CSS 变量，供顶栏/底栏组件读取。
 */
export function useSkinCssVars() {
  const skin = useSkinStore();
  const root = document.documentElement;

  function sync() {
    const theme = skin.theme;
    root.classList.toggle('skin-active', skin.isActive);

    if (!theme) {
      [
        '--skin-top-bg-image',
        '--skin-top-gradient',
        '--skin-tab-bg-image',
        '--skin-tab-inactive',
        '--skin-tab-active',
        '--skin-accent',
        '--skin-text',
      ].forEach((key) => root.style.removeProperty(key));
      return;
    }

    setVar(root, '--skin-top-bg-image', theme.topNav?.backgroundImage ? `url("${theme.topNav.backgroundImage}")` : '');
    setVar(root, '--skin-top-gradient', theme.topNav?.gradient || '');
    setVar(root, '--skin-tab-bg-image', theme.tabBar?.backgroundImage ? `url("${theme.tabBar.backgroundImage}")` : '');
    setVar(root, '--skin-tab-inactive', theme.tabBar?.inactiveColor || '');
    setVar(root, '--skin-tab-active', theme.tabBar?.activeColor || theme.colors?.accent || '');
    setVar(root, '--skin-accent', theme.colors?.accent || '');
    setVar(root, '--skin-text', theme.colors?.text || '');
  }

  watch(() => skin.theme, sync, { deep: true, immediate: true });

  onScopeDispose(() => {
    root.classList.remove('skin-active');
  });

  return { sync };
}
