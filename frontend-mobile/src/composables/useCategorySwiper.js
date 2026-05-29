import { ref, onMounted, onUnmounted, nextTick } from 'vue';

/**
 * Sync horizontal category swiper with tab selection.
 */
export function useCategorySwiper(categories, activeCategoryRef) {
  const swiperRef = ref(null);
  let scrollingProgrammatically = false;
  let scrollEndTimer = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchAxis = null;

  function getIndex(id) {
    return categories.findIndex((c) => c.id === id);
  }

  function scrollToCategory(id, smooth = true) {
    const el = swiperRef.value;
    if (!el) return;
    const index = getIndex(id);
    if (index < 0) return;

    scrollingProgrammatically = true;
    const left = index * el.clientWidth;
    el.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });

    window.clearTimeout(scrollEndTimer);
    scrollEndTimer = window.setTimeout(() => {
      scrollingProgrammatically = false;
    }, smooth ? 320 : 0);
  }

  function readCategoryFromScroll() {
    if (scrollingProgrammatically) return;
    const el = swiperRef.value;
    if (!el || !el.clientWidth) return;

    const index = Math.round(el.scrollLeft / el.clientWidth);
    const cat = categories[index];
    if (cat && cat.id !== activeCategoryRef.value) {
      activeCategoryRef.value = cat.id;
    }
  }

  function onTouchStart(e) {
    if (scrollingProgrammatically) return;
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchAxis = null;
  }

  function onTouchMove(e) {
    if (touchAxis !== null || scrollingProgrammatically) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    touchAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
  }

  function onTouchEnd(e) {
    if (touchAxis !== 'x' || scrollingProgrammatically) {
      touchAxis = null;
      return;
    }

    if (e.target?.closest?.('.continue-scroll')) {
      touchAxis = null;
      return;
    }

    const el = swiperRef.value;
    const startLeft = el?.scrollLeft ?? 0;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;

    // Native horizontal scroll already moved — scroll handler will sync tabs.
    if (el && Math.abs(el.scrollLeft - startLeft) > 12) {
      touchAxis = null;
      readCategoryFromScroll();
      return;
    }

    const threshold = 50;
    if (Math.abs(dx) >= threshold) {
      const currentIndex = getIndex(activeCategoryRef.value);
      const nextIndex = dx < 0
        ? Math.min(currentIndex + 1, categories.length - 1)
        : Math.max(currentIndex - 1, 0);
      if (nextIndex !== currentIndex) {
        activeCategoryRef.value = categories[nextIndex].id;
        scrollToCategory(categories[nextIndex].id);
      }
    }

    touchAxis = null;
  }

  function bindSwiper(el) {
    if (!el || el.dataset.categorySwiperBound) return;
    el.dataset.categorySwiperBound = '1';

    el.addEventListener('scroll', readCategoryFromScroll, { passive: true });
    if ('onscrollend' in window) {
      el.addEventListener('scrollend', readCategoryFromScroll, { passive: true });
    }
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
  }

  function unbindSwiper(el) {
    if (!el?.dataset?.categorySwiperBound) return;
    delete el.dataset.categorySwiperBound;

    el.removeEventListener('scroll', readCategoryFromScroll);
    el.removeEventListener('scrollend', readCategoryFromScroll);
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchmove', onTouchMove);
    el.removeEventListener('touchend', onTouchEnd);
  }

  function initSwiper() {
    nextTick(() => {
      const el = swiperRef.value;
      if (!el) return;
      bindSwiper(el);
      scrollToCategory(activeCategoryRef.value, false);
    });
  }

  onMounted(() => {
    nextTick(() => {
      if (swiperRef.value) bindSwiper(swiperRef.value);
    });
  });

  onUnmounted(() => {
    window.clearTimeout(scrollEndTimer);
    if (swiperRef.value) unbindSwiper(swiperRef.value);
  });

  return { swiperRef, scrollToCategory, initSwiper };
}
