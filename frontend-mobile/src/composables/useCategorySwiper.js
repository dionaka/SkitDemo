import { ref, onMounted, onUnmounted, nextTick } from 'vue';

/**
 * Sync horizontal category swiper with tab selection.
 */
export function useCategorySwiper(categories, activeCategoryRef) {
  const swiperRef = ref(null);
  let scrollingProgrammatically = false;
  let scrollEndTimer = null;
  let scrollRaf = 0;

  function getIndex(id) {
    return categories.findIndex((c) => c.id === id);
  }

  function clearProgrammaticFlag() {
    scrollingProgrammatically = false;
    window.clearTimeout(scrollEndTimer);
    scrollEndTimer = null;
  }

  function markProgrammaticScroll(smooth) {
    scrollingProgrammatically = true;
    window.clearTimeout(scrollEndTimer);
    scrollEndTimer = window.setTimeout(clearProgrammaticFlag, smooth ? 400 : 0);
  }

  function scrollToCategory(id, smooth = true) {
    const el = swiperRef.value;
    if (!el) return;
    const index = getIndex(id);
    if (index < 0) return;

    markProgrammaticScroll(smooth);
    if (smooth) el.classList.add('smooth-scroll');
    const left = index * el.clientWidth;
    el.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    if (smooth) {
      window.setTimeout(() => el.classList.remove('smooth-scroll'), 400);
    }
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

  function scheduleReadCategoryFromScroll() {
    if (scrollRaf) return;
    scrollRaf = window.requestAnimationFrame(() => {
      scrollRaf = 0;
      readCategoryFromScroll();
    });
  }

  function onScrollEnd() {
    clearProgrammaticFlag();
    readCategoryFromScroll();
  }

  function bindSwiper(el) {
    if (!el || el.dataset.categorySwiperBound) return;
    el.dataset.categorySwiperBound = '1';

    el.addEventListener('scroll', scheduleReadCategoryFromScroll, { passive: true });
    el.addEventListener('scrollend', onScrollEnd, { passive: true });
  }

  function unbindSwiper(el) {
    if (!el?.dataset?.categorySwiperBound) return;
    delete el.dataset.categorySwiperBound;

    el.removeEventListener('scroll', scheduleReadCategoryFromScroll);
    el.removeEventListener('scrollend', onScrollEnd);
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
    if (scrollRaf) window.cancelAnimationFrame(scrollRaf);
    if (swiperRef.value) unbindSwiper(swiperRef.value);
  });

  return { swiperRef, scrollToCategory, initSwiper };
}
