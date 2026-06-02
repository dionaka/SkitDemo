import { ref, onMounted, onUnmounted } from 'vue';

const PULL_THRESHOLD = 56;
const MAX_PULL = 88;
const FLOAT_TRAVEL = 56;

/** Capacitor / Vue 使用 Hash 路由 */
export function isHomeHashRoute() {
  const hash = window.location.hash || '#/';
  return hash === '#/' || hash === '' || hash.startsWith('#/?');
}

function getScrollEl() {
  return document.querySelector('.app-main');
}

/** 先滚到顶部（点首页 Tab 时用） */
export function scrollHomeMainToTop(behavior = 'smooth') {
  const el = getScrollEl();
  if (!el || el.scrollTop <= 2) return Promise.resolve();

  return new Promise((resolve) => {
    el.scrollTo({ top: 0, behavior });
    const started = Date.now();
    const done = () => resolve();
    const tick = () => {
      if (el.scrollTop <= 2 || Date.now() - started > 520) done();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/**
 * 首页下拉刷新：一二三部分布局不动，动效从第一部分底边滑出叠在第二部分上方。
 */
export function useHomeSkinRefresh(onRefresh) {
  const pullDistance = ref(0);
  const isRefreshing = ref(false);
  const isPulling = ref(false);

  let scrollEl = null;
  let startY = 0;
  let pulling = false;

  /** 仅第一部分（顶栏 + 占位）可触发下拉 */
  function isInPullZone(clientY) {
    const topNav = document.querySelector('.home-top-nav');
    if (!topNav) return false;

    const navRect = topNav.getBoundingClientRect();
    let bottom = navRect.bottom;

    const spacer = document.querySelector('.home .nav-spacer');
    if (spacer) {
      bottom = spacer.getBoundingClientRect().bottom;
    }

    return clientY >= navRect.top && clientY <= bottom + 12;
  }

  async function runRefresh() {
    if (isRefreshing.value) return;
    isRefreshing.value = true;
    pullDistance.value = FLOAT_TRAVEL;
    try {
      await onRefresh?.();
    } finally {
      setTimeout(() => {
        isRefreshing.value = false;
        pullDistance.value = 0;
        isPulling.value = false;
      }, 620);
    }
  }

  /** 点底栏首页：先滚到顶再播放滑出刷新 */
  async function runRefreshFromTab() {
    if (!isHomeHashRoute()) return;
    await scrollHomeMainToTop('smooth');
    await runRefresh();
  }

  function onTouchStart(event) {
    if (!isHomeHashRoute()) return;
    if (!scrollEl || scrollEl.scrollTop > 2 || isRefreshing.value) return;
    if (!isInPullZone(event.touches[0].clientY)) return;

    startY = event.touches[0].clientY;
    pulling = true;
  }

  function onTouchMove(event) {
    if (!pulling || !scrollEl || scrollEl.scrollTop > 2) return;

    const delta = event.touches[0].clientY - startY;
    if (delta <= 0) {
      pullDistance.value = 0;
      isPulling.value = false;
      return;
    }

    isPulling.value = true;
    pullDistance.value = Math.min(MAX_PULL, delta * 0.65);
    if (pullDistance.value > 4) event.preventDefault();
  }

  function onTouchEnd() {
    if (!pulling) return;
    pulling = false;

    if (pullDistance.value >= PULL_THRESHOLD) {
      runRefresh();
      return;
    }

    pullDistance.value = 0;
    isPulling.value = false;
  }

  onMounted(() => {
    scrollEl = getScrollEl();
    scrollEl?.addEventListener('touchstart', onTouchStart, { passive: true });
    scrollEl?.addEventListener('touchmove', onTouchMove, { passive: false });
    scrollEl?.addEventListener('touchend', onTouchEnd, { passive: true });
  });

  onUnmounted(() => {
    scrollEl?.removeEventListener('touchstart', onTouchStart);
    scrollEl?.removeEventListener('touchmove', onTouchMove);
    scrollEl?.removeEventListener('touchend', onTouchEnd);
  });

  return {
    pullDistance,
    isPulling,
    isRefreshing,
    runRefresh,
    runRefreshFromTab,
    floatTravel: FLOAT_TRAVEL,
  };
}
