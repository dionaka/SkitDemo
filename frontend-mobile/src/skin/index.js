import { useSkinStore } from './store/skinStore';

export { parseSkinFile } from './parser/parseSkinFile';
export { normalizeBilibiliSkin, isSkinActive } from './parser/normalizeTheme';
export { useSkinStore } from './store/skinStore';
export { useSkinCssVars } from './composables/useSkinCssVars';
export {
  useHomeSkinRefresh,
  scrollHomeMainToTop,
  isHomeHashRoute,
  isHomeRoute,
  getHomeScrollEl,
} from './composables/useHomeSkinRefresh';

export { default as SkinProvider } from './components/SkinProvider.vue';
export { default as SkinTabBar } from './components/SkinTabBar.vue';
export { default as SkinRefreshEffect } from './components/SkinRefreshEffect.vue';

/**
 * 初始化 bilibili-skin 模块（本地默认值；云端数据由 userCloudSync 异步拉取）。
 */
export async function initSkinModule(pinia) {
  useSkinStore(pinia).hydrate();
}
