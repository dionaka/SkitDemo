import { ref, onMounted, onUnmounted } from 'vue';

const PULL_THRESHOLD = 72;
const MAX_PULL = 120;

/**
 * 首页下拉刷新 + 点击首页 Tab 触发动效。
 */
export function useHomeSkinRefresh(onRefresh) {
  const pullDistance = ref(0);
  const isRefreshing = ref(false);
  const isPulling = ref(false);

  let scrollEl = null;
  let startY = 0;
  let pulling = false;

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
    if (!scrollEl || scrollEl.scrollTop > 0 || isRefreshing.value) return;
    startY = event.touches[0].clientY;
    pulling = true;
  }

  function onTouchMove(event) {
    if (!pulling || !scrollEl || scrollEl.scrollTop > 0) return;
    const delta = event.touches[0].clientY - startY;
    if (delta <= 0) {
      pullDistance.value = 0;
      isPulling.value = false;
      return;
    }
    isPulling.value = true;
    pullDistance.value = Math.min(MAX_PULL, delta * 0.55);
    if (pullDistance.value > 8) event.preventDefault();
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
