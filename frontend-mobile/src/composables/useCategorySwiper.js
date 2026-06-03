import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { resolveCategorySwipeSensitivity } from '@/utils/categorySwipeSensitivity';

/**
 * 首页分类横滑：transform 轨道
 * sensitivityRef：1~5，可在设置中调节
 */
export function useCategorySwiper(categories, activeCategoryRef, sensitivityRef) {
  const viewportRef = ref(null);
  const activeIndex = ref(0);
  const dragBaseIndex = ref(0);
  const isPanning = ref(false);
  const dragOffsetPx = ref(0);
  const transitionEnabled = ref(false);

  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartIndex = 0;
  let axisLock = null;
  let isDragging = false;
  let menuPickLock = false;
  let lastMoveX = 0;
  let lastMoveTime = 0;
  let velocityX = 0;

  const CAPTURE_OPTS = { capture: true };

  function sensitivityConfig() {
    const level = sensitivityRef?.value ?? sensitivityRef;
    return resolveCategorySwipeSensitivity(level);
  }

  function clamp(i) {
    return Math.max(0, Math.min(i, categories.length - 1));
  }

  function idToIndex(id) {
    return categories.findIndex((c) => c.id === id);
  }

  function indexToId(i) {
    return categories[clamp(i)]?.id ?? categories[0]?.id;
  }

  function viewportWidth() {
    return viewportRef.value?.clientWidth || 0;
  }

  function bindIndex(i) {
    const idx = clamp(i);
    activeIndex.value = idx;
    const id = indexToId(idx);
    if (id) activeCategoryRef.value = id;
  }

  function previewMenuFromDx(dx) {
    const w = viewportWidth();
    if (!w) return;
    const preview = clamp(Math.round(dragStartIndex - dx / w));
    const id = indexToId(preview);
    if (id) activeCategoryRef.value = id;
  }

  function resolveHorizontalLock(dx, dy) {
    const cfg = sensitivityConfig();
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (adx + ady < cfg.axisMinPx) return null;
    if (ady > cfg.verticalDyMin && ady > adx * cfg.verticalLockRatio) return 'y';
    if (adx >= cfg.axisMinPx && adx >= ady * cfg.horizontalBias) return 'x';
    return null;
  }

  function applyDragOffset(dx) {
    const { dragGain } = sensitivityConfig();
    let offset = dx * dragGain;
    if (dragStartIndex <= 0 && offset > 0) offset *= 0.4;
    if (dragStartIndex >= categories.length - 1 && offset < 0) offset *= 0.4;
    dragOffsetPx.value = offset;
  }

  function currentDragGain() {
    return sensitivityConfig().dragGain || 1;
  }

  function resolveNextIndex(dx) {
    const cfg = sensitivityConfig();
    const w = viewportWidth() || 360;
    const commitPx = Math.max(cfg.minCommitPx, w * cfg.commitRatio);

    if (cfg.flingEnabled && Math.abs(velocityX) >= cfg.flingVelocity) {
      return clamp(dragStartIndex + (velocityX > 0 ? -1 : 1));
    }

    if (dx > commitPx) return clamp(dragStartIndex - 1);
    if (dx < -commitPx) return clamp(dragStartIndex + 1);

    if (Math.abs(dx) >= w * cfg.halfPageRatio) {
      return clamp(Math.round(dragStartIndex - dx / w));
    }

    return dragStartIndex;
  }

  const trackStyle = computed(() => {
    const base = isPanning.value ? dragBaseIndex.value : activeIndex.value;
    return {
      transform: `translate3d(calc(-${base * 100}% + ${dragOffsetPx.value}px), 0, 0)`,
      transition: transitionEnabled.value && !isPanning.value
        ? 'transform 0.18s ease-out'
        : 'none',
    };
  });

  function selectCategory(id) {
    const i = idToIndex(id);
    if (i < 0) return;

    menuPickLock = true;
    isPanning.value = false;
    isDragging = false;
    axisLock = null;
    velocityX = 0;
    dragOffsetPx.value = 0;
    transitionEnabled.value = false;
    bindIndex(i);
  }

  function resetGesture() {
    isDragging = false;
    axisLock = null;
    isPanning.value = false;
    dragOffsetPx.value = 0;
    velocityX = 0;
  }

  function beginHorizontalPan() {
    isDragging = true;
    isPanning.value = true;
    dragBaseIndex.value = dragStartIndex;
  }

  function onTouchStart(e) {
    if (e.target.closest('.continue-scroll')) return;

    menuPickLock = false;
    resetGesture();
    transitionEnabled.value = false;
    const touch = e.touches[0];
    dragStartX = touch.clientX;
    dragStartY = touch.clientY;
    dragStartIndex = activeIndex.value;
    dragBaseIndex.value = activeIndex.value;
    lastMoveX = touch.clientX;
    lastMoveTime = performance.now();
  }

  function onTouchMove(e) {
    if (menuPickLock) return;
    if (e.target.closest('.continue-scroll')) return;

    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    const dx = x - dragStartX;
    const dy = y - dragStartY;

    if (!axisLock) {
      const lock = resolveHorizontalLock(dx, dy);
      if (!lock) return;
      axisLock = lock;
      if (axisLock === 'y') return;
      beginHorizontalPan();
    }

    if (axisLock !== 'x' || !isDragging) return;

    e.preventDefault();
    e.stopPropagation();

    const now = performance.now();
    const dt = Math.max(now - lastMoveTime, 1);
    velocityX = (x - lastMoveX) / dt;
    lastMoveX = x;
    lastMoveTime = now;

    if (!viewportWidth()) return;

    applyDragOffset(dx);
    previewMenuFromDx(dx);
  }

  function onTouchEnd() {
    if (menuPickLock) {
      resetGesture();
      return;
    }

    if (axisLock !== 'x' || !isDragging) {
      resetGesture();
      return;
    }

    const dx = dragOffsetPx.value / currentDragGain();
    const next = resolveNextIndex(dx);

    isPanning.value = false;
    dragOffsetPx.value = 0;
    isDragging = false;
    axisLock = null;
    velocityX = 0;
    transitionEnabled.value = true;
    bindIndex(next);
  }

  function bindViewport(node) {
    if (!node) return;
    unbindViewport(node);
    node.dataset.categoryViewportBound = '1';
    const opts = { ...CAPTURE_OPTS };
    node.addEventListener('touchstart', onTouchStart, { passive: true, ...opts });
    node.addEventListener('touchmove', onTouchMove, { passive: false, ...opts });
    node.addEventListener('touchend', onTouchEnd, { passive: true, ...opts });
    node.addEventListener('touchcancel', onTouchEnd, { passive: true, ...opts });
  }

  function unbindViewport(node) {
    if (!node) return;
    delete node.dataset.categoryViewportBound;
    const opts = { ...CAPTURE_OPTS };
    node.removeEventListener('touchstart', onTouchStart, opts);
    node.removeEventListener('touchmove', onTouchMove, opts);
    node.removeEventListener('touchend', onTouchEnd, opts);
    node.removeEventListener('touchcancel', onTouchEnd, opts);
  }

  function initSwiper() {
    nextTick(() => {
      const node = viewportRef.value;
      if (!node) return;
      bindViewport(node);
      transitionEnabled.value = false;
      bindIndex(idToIndex(activeCategoryRef.value || categories[0]?.id));
      dragOffsetPx.value = 0;
      isPanning.value = false;
      menuPickLock = false;
    });
  }

  onMounted(() => {
    nextTick(() => {
      if (viewportRef.value) bindViewport(viewportRef.value);
    });
  });

  onUnmounted(() => {
    const node = viewportRef.value;
    if (node) unbindViewport(node);
  });

  return {
    swiperRef: viewportRef,
    trackStyle,
    scrollToCategory: selectCategory,
    selectCategory,
    initSwiper,
  };
}
