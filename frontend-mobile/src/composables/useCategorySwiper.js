import { ref, onMounted, onUnmounted, nextTick } from 'vue';

/**
 * Carousel-style category swiper: free finger tracking, snap on release,
 * at most one category per gesture, no mid-scroll clamping.
 */
export function useCategorySwiper(categories, activeCategoryRef) {
  const swiperRef = ref(null);
  let settledIndex = 0;
  let scrollRaf = 0;
  let programmaticNav = false;
  let programmaticTimer = null;

  function getIndex(id) {
    return categories.findIndex((c) => c.id === id);
  }

  function clampIndex(index) {
    return Math.max(0, Math.min(index, categories.length - 1));
  }

  function pageIndexFromScroll(scrollLeft, pageWidth) {
    return clampIndex(Math.round(scrollLeft / pageWidth));
  }

  function applyCategoryIndex(index) {
    const cat = categories[clampIndex(index)];
    if (cat && cat.id !== activeCategoryRef.value) {
      activeCategoryRef.value = cat.id;
    }
  }

  function scrollToCategory(id, smooth = true) {
    const el = swiperRef.value;
    if (!el) return;
    const index = getIndex(id);
    if (index < 0) return;

    programmaticNav = true;
    window.clearTimeout(programmaticTimer);
    programmaticTimer = window.setTimeout(() => {
      programmaticNav = false;
    }, smooth ? 420 : 0);

    settledIndex = index;
    if (smooth) el.classList.add('smooth-scroll');
    el.scrollTo({ left: index * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
    activeCategoryRef.value = id;
    if (smooth) {
      window.setTimeout(() => el.classList.remove('smooth-scroll'), 420);
    }
  }

  function settleFromScroll(smooth = false) {
    const el = swiperRef.value;
    if (!el || !el.clientWidth) return;

    const pageWidth = el.clientWidth;
    let index = pageIndexFromScroll(el.scrollLeft, pageWidth);

    if (!programmaticNav && Math.abs(index - settledIndex) > 1) {
      index = settledIndex + Math.sign(index - settledIndex);
    }

    const targetLeft = index * pageWidth;
    settledIndex = index;
    applyCategoryIndex(index);

    if (Math.abs(el.scrollLeft - targetLeft) > 1) {
      if (smooth) el.classList.add('smooth-scroll');
      el.scrollTo({ left: targetLeft, behavior: smooth ? 'smooth' : 'auto' });
      if (smooth) {
        window.setTimeout(() => el.classList.remove('smooth-scroll'), 420);
      }
    }
  }

  function onScroll() {
    if (scrollRaf || programmaticNav) return;
    scrollRaf = window.requestAnimationFrame(() => {
      scrollRaf = 0;
      const el = swiperRef.value;
      if (!el || !el.clientWidth) return;
      applyCategoryIndex(pageIndexFromScroll(el.scrollLeft, el.clientWidth));
    });
  }

  function onScrollEnd() {
    if (programmaticNav) {
      const el = swiperRef.value;
      if (el?.clientWidth) {
        settledIndex = pageIndexFromScroll(el.scrollLeft, el.clientWidth);
        applyCategoryIndex(settledIndex);
      }
      return;
    }
    settleFromScroll(false);
  }

  function onTouchEnd(e) {
    if (programmaticNav) return;
    if (e.target?.closest?.('.continue-scroll')) return;
    if ('onscrollend' in window) return;
    window.setTimeout(() => settleFromScroll(false), 60);
  }

  function bindSwiper(el) {
    if (!el || el.dataset.categorySwiperBound) return;
    el.dataset.categorySwiperBound = '1';
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('scrollend', onScrollEnd, { passive: true });
  }

  function unbindSwiper(el) {
    if (!el?.dataset?.categorySwiperBound) return;
    delete el.dataset.categorySwiperBound;
    el.removeEventListener('touchend', onTouchEnd);
    el.removeEventListener('scroll', onScroll);
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
    window.clearTimeout(programmaticTimer);
    if (scrollRaf) window.cancelAnimationFrame(scrollRaf);
    if (swiperRef.value) unbindSwiper(swiperRef.value);
  });

  return { swiperRef, scrollToCategory, initSwiper };
}
