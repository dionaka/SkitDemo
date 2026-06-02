import { ref, onMounted, onUnmounted } from 'vue';

const PULL_THRESHOLD = 64;
const MAX_PULL = 100;

function isHomeRoute() {
  return window.location.pathname === '/' || window.location.pathname === '';
}

/**
 * 仅在首页顶栏遮罩区（顶栏 + 分类栏分界上方）触发下拉刷新。
 */
export function useHomeSkinRefresh(onRefresh) {
  const pullDistance = ref(0);
  const isRefreshing = ref(false);
  const isPulling = ref(false);

  let scrollEl = null;
  let startY = 0;
  let pulling = false;

  function isInPullZone(clientY) {
    const topNav = document.querySelector('.home-top-nav');
    if (!topNav) return false;

    const navRect = topNav.getBoundingClientRect();
    let bottom = navRect.bottom;

    const spacer = document.querySelector('.home .nav-spacer');
    if (spacer) {
      bottom = spacer.getBoundingClientRect().bottom;
    }

    return clientY >= navRect.top && clientY <= bottom + 8;
  }

  async function runRefresh() {
    if (isRefreshing.value) return;
    isRefreshing.value = true;
    try {
      await onRefresh?.();
    } finally {
      setTimeout(() => {
        isRefreshing.value = false;
        pullDistance.value = 0;
        isPulling.value = false;
      }, 520);
    }
  }

  function onTouchStart(event) {
    if (!isHomeRoute()) return;
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
    pullDistance.value = Math.min(MAX_PULL, delta * 0.5);
    if (pullDistance.value > 6) event.preventDefault();
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
