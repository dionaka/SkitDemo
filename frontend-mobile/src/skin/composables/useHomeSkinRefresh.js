import { ref, onMounted, onUnmounted } from 'vue';

const PULL_THRESHOLD = 56;
const MAX_PULL = 96;

/** Capacitor / Vue 使用 Hash 路由，不能用 pathname 判断首页 */
export function isHomeHashRoute() {
  const hash = window.location.hash || '#/';
  return hash === '#/' || hash === '' || hash.startsWith('#/?');
}

/**
 * 首页下拉刷新：在顶栏 + 分类栏区域下拉，从分界处展开动效。
 */
export function useHomeSkinRefresh(onRefresh, pullAnchorRef) {
  const pullDistance = ref(0);
  const isRefreshing = ref(false);
  const isPulling = ref(false);

  let scrollEl = null;
  let startY = 0;
  let pulling = false;

  function isInPullZone(clientY) {
    const topNav = document.querySelector('.home-top-nav');
    let top = 0;
    let bottom = 160;

    if (topNav) {
      const navRect = topNav.getBoundingClientRect();
      top = navRect.top;
      bottom = navRect.bottom;
    }

    const spacer = document.querySelector('.home .nav-spacer');
    if (spacer) {
      bottom = Math.max(bottom, spacer.getBoundingClientRect().bottom);
    }

    const anchor = pullAnchorRef?.value;
    if (anchor) {
      const anchorRect = anchor.getBoundingClientRect();
      top = Math.min(top, anchorRect.top);
      bottom = anchorRect.bottom;
    }

    return clientY >= top && clientY <= bottom + 16;
  }

  async function runRefresh() {
    if (isRefreshing.value) return;
    isRefreshing.value = true;
    pullDistance.value = PULL_THRESHOLD;
    try {
      await onRefresh?.();
    } finally {
      setTimeout(() => {
        isRefreshing.value = false;
        pullDistance.value = 0;
        isPulling.value = false;
      }, 600);
    }
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
    pullDistance.value = Math.min(MAX_PULL, delta * 0.55);
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
    scrollEl = document.querySelector('.app-main');
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
  };
}
