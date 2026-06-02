import { onActivated, nextTick } from 'vue';

function getHomeScrollEl() {
  return document.querySelector('.app-main') || document.scrollingElement;
}

let savedScrollTop = 0;
let restoreTimer = null;

function isHomeRouteName(name) {
  return name === 'VideoList';
}

/** 离开首页前记录滚动位置（仅接受有效滚动值，避免被详情页覆盖） */
export function captureHomeScroll(force = false) {
  const el = getHomeScrollEl();
  if (!el) return;

  const top = el.scrollTop;
  if (force) {
    savedScrollTop = top;
    return;
  }
  // 详情页切换后 scrollTop 常接近 0，勿覆盖此前保存的首页位置
  if (top >= savedScrollTop || savedScrollTop < 24) {
    savedScrollTop = top;
  }
}

/** 点首页 Tab 回顶后清除快照 */
export function clearHomeScrollSnapshot() {
  savedScrollTop = 0;
  if (restoreTimer) {
    clearTimeout(restoreTimer);
    restoreTimer = null;
  }
}

function getRestoreTarget() {
  const el = getHomeScrollEl();
  if (!el) return 0;
  const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
  return Math.min(savedScrollTop, maxScroll);
}

/** 回到首页后恢复滚动位置（布局切换后多次重试） */
export function restoreHomeScroll() {
  if (savedScrollTop <= 0) return;

  if (restoreTimer) clearTimeout(restoreTimer);

  let attempts = 0;
  const maxAttempts = 20;

  const apply = () => {
    const el = getHomeScrollEl();
    if (!el) return false;
    const want = getRestoreTarget();
    el.scrollTop = want;
    return Math.abs(el.scrollTop - want) <= 4;
  };

  const tick = () => {
    attempts += 1;
    const ok = apply();
    if (!ok && attempts < maxAttempts) {
      requestAnimationFrame(tick);
    } else {
      restoreTimer = null;
    }
  };

  nextTick(() => {
    requestAnimationFrame(tick);
  });
}

/** 路由级保存/恢复，早于 keep-alive deactivated */
export function setupHomeScrollRouter(router) {
  router.beforeEach((to, from) => {
    if (isHomeRouteName(from.name)) {
      captureHomeScroll(true);
    }
  });

  router.afterEach((to) => {
    if (isHomeRouteName(to.name)) {
      restoreHomeScroll();
    }
  });
}

/**
 * 首页滚动位置记忆（配合 setupHomeScrollRouter 使用）
 */
export function useHomeScrollRestore() {
  onActivated(() => {
    restoreHomeScroll();
  });
}
