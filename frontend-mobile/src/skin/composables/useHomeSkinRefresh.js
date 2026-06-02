import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';

const PULL_THRESHOLD = 56;
const MAX_PULL = 88;
const FLOAT_TRAVEL = 56;
const SCROLL_AT_TOP = 12;

/** Capacitor / Vue 使用 Hash 路由 */
export function isHomeHashRoute() {
  const hash = window.location.hash || '';
  if (!hash) {
    const path = window.location.pathname || '/';
    return path === '/' || path.endsWith('/index.html');
  }
  const path = hash.replace(/^#/, '') || '/';
  return path === '/' || path.startsWith('/?');
}

export function isHomeRoute() {
  return isHomeHashRoute();
}

export function getHomeScrollEl() {
  return document.querySelector('.app-main') || document.scrollingElement;
}

function getScrollTargets() {
  const main = document.querySelector('.app-main');
  const targets = [];
  if (main) targets.push(main);
  const root = document.scrollingElement;
  if (root && !targets.includes(root)) targets.push(root);
  return targets;
}

/** 先滚到顶部（点首页 Tab 时用） */
export function scrollHomeMainToTop(behavior = 'auto') {
  const targets = getScrollTargets();
  if (!targets.length) return Promise.resolve();

  const needsScroll = targets.some((el) => el.scrollTop > SCROLL_AT_TOP);
  if (!needsScroll) return Promise.resolve();

  return new Promise((resolve) => {
    for (const el of targets) {
      if (behavior === 'auto') {
        el.scrollTop = 0;
      } else {
        el.scrollTo({ top: 0, behavior });
      }
    }
    const started = Date.now();
    const maxWait = behavior === 'smooth' ? 720 : 120;
    const tick = () => {
      const atTop = targets.every((el) => el.scrollTop <= SCROLL_AT_TOP);
      if (atTop || Date.now() - started > maxWait) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/**
 * 首页下拉刷新：一二三部分布局不动，动效从第一部分底边滑出叠在第二部分上方。
 */
export function useHomeSkinRefresh(onRefresh) {
  const route = useRoute();
  const pullDistance = ref(0);
  const isRefreshing = ref(false);
  const isPulling = ref(false);

  let scrollEl = null;
  let startY = 0;
  let pulling = false;

  function isOnHome() {
    return route.path === '/' && isHomeRoute();
  }

  function getScrollEl() {
    return scrollEl || getHomeScrollEl();
  }

  function isAtScrollTop() {
    const el = getScrollEl();
    if (!el) return true;
    return el.scrollTop <= SCROLL_AT_TOP;
  }

  /** 在顶部时排除底栏区域即可下拉（动效仍从顶栏底滑出） */
  function isTouchInPullArea(clientY) {
    const tabBar = document.querySelector('.skin-tab-bar');
    if (tabBar) {
      const tabRect = tabBar.getBoundingClientRect();
      if (clientY >= tabRect.top - 8) return false;
    }
    return true;
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
    if (!isOnHome()) return;
    await scrollHomeMainToTop('auto');
    await runRefresh();
  }

  function onTouchStart(event) {
    if (!isOnHome() || isRefreshing.value) return;
    if (!isAtScrollTop()) return;

    const touch = event.touches[0];
    if (!isTouchInPullArea(touch.clientY)) return;

    startY = touch.clientY;
    pulling = true;
  }

  function onTouchMove(event) {
    if (!pulling || !isOnHome() || !isAtScrollTop()) return;

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
    scrollEl = getHomeScrollEl();
    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true, capture: true });
  });

  onUnmounted(() => {
    document.removeEventListener('touchstart', onTouchStart, { capture: true });
    document.removeEventListener('touchmove', onTouchMove, { capture: true });
    document.removeEventListener('touchend', onTouchEnd, { capture: true });
    document.removeEventListener('touchcancel', onTouchEnd, { capture: true });
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
