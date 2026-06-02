import { onActivated, nextTick } from 'vue';

function getHomeScrollEl() {
  return document.querySelector('.app-main') || document.scrollingElement;
}

let savedScrollTop = 0;
let savedScrollRatio = 0;
let savedCategoryId = 'hot';
let getCategoryId = () => 'hot';
let scrollToCategoryFn = null;
let resizeObserver = null;
let restoreTimeouts = [];

function isHomeRouteName(name) {
  return name === 'VideoList';
}

function captureFromElement(el) {
  const max = Math.max(0, el.scrollHeight - el.clientHeight);
  savedScrollTop = el.scrollTop;
  savedScrollRatio = max > 0 ? el.scrollTop / max : 0;
  savedCategoryId = getCategoryId();
}

/** 离开首页 / 点击短剧前立即写入最新滚动 */
export function flushHomeScrollCapture() {
  const el = getHomeScrollEl();
  if (el) captureFromElement(el);
}

export function registerHomeScrollContext(ctx = {}) {
  if (typeof ctx.getCategoryId === 'function') getCategoryId = ctx.getCategoryId;
  if (typeof ctx.scrollToCategory === 'function') scrollToCategoryFn = ctx.scrollToCategory;
}

/** @deprecated 使用 flushHomeScrollCapture */
export function captureHomeScroll(force = false) {
  const el = getHomeScrollEl();
  if (!el) return;
  if (force || el.scrollTop >= savedScrollTop || savedScrollTop < 24) {
    captureFromElement(el);
  }
}

export function clearHomeScrollSnapshot() {
  savedScrollTop = 0;
  savedScrollRatio = 0;
  stopRestoreWatchers();
}

function stopRestoreWatchers() {
  resizeObserver?.disconnect();
  resizeObserver = null;
  restoreTimeouts.forEach((id) => clearTimeout(id));
  restoreTimeouts = [];
}

function computeTarget(el) {
  const max = Math.max(0, el.scrollHeight - el.clientHeight);
  if (max <= 0) return 0;
  const byRatio = Math.round(savedScrollRatio * max);
  return Math.min(Math.max(savedScrollTop, byRatio), max);
}

function applyRestore() {
  const el = getHomeScrollEl();
  if (!el) return false;
  if (savedScrollTop <= 8 && savedScrollRatio < 0.02) return true;

  const want = computeTarget(el);
  el.scrollTop = want;
  scrollToCategoryFn?.(savedCategoryId, false);
  return Math.abs(el.scrollTop - want) <= 8;
}

/** 回到首页后恢复滚动（等内容高度稳定，避免卡在「热门短剧」附近） */
export function restoreHomeScroll() {
  if (savedScrollTop <= 8 && savedScrollRatio < 0.02) return;

  stopRestoreWatchers();

  const run = () => applyRestore();

  nextTick(() => {
    run();
    requestAnimationFrame(run);
  });

  restoreTimeouts = [50, 120, 280, 500, 900, 1500].map((ms) => setTimeout(run, ms));

  const homeEl = document.querySelector('.home');
  const observeTarget = homeEl || getHomeScrollEl();
  if (observeTarget && typeof ResizeObserver !== 'undefined') {
    let lastHeight = 0;
    resizeObserver = new ResizeObserver(() => {
      const main = getHomeScrollEl();
      if (!main) return;
      const h = main.scrollHeight;
      const ok = applyRestore();
      if (ok && Math.abs(h - lastHeight) < 3) {
        stopRestoreWatchers();
      }
      lastHeight = h;
    });
    resizeObserver.observe(observeTarget);
    restoreTimeouts.push(setTimeout(stopRestoreWatchers, 2800));
  }
}

/** 路由 + 实时滚动跟踪 */
export function setupHomeScrollRouter(router) {
  let scrollBound = false;

  const bindLiveScroll = () => {
    const el = getHomeScrollEl();
    if (!el || scrollBound) return;
    scrollBound = true;
    el.addEventListener(
      'scroll',
      () => {
        if (router.currentRoute.value.name === 'VideoList') {
          captureFromElement(el);
        }
      },
      { passive: true },
    );
  };

  router.isReady().then(bindLiveScroll);

  router.beforeEach((to, from) => {
    if (isHomeRouteName(from.name)) {
      flushHomeScrollCapture();
    }
  });

  router.afterEach((to) => {
    if (isHomeRouteName(to.name)) {
      bindLiveScroll();
      restoreHomeScroll();
    }
  });
}

export function useHomeScrollRestore() {
  onActivated(() => {
    restoreHomeScroll();
  });
}
