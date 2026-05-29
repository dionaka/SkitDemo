import { ref, onUnmounted, nextTick } from 'vue';

/**
 * Sync horizontal category swiper with tab selection.
 */
export function useCategorySwiper(categories) {
  const swiperRef = ref(null);
  let scrollingProgrammatically = false;
  let scrollEndTimer = null;

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

  function readCategoryFromScroll(activeId) {
    if (scrollingProgrammatically) return;
    const el = swiperRef.value;
    if (!el || !el.clientWidth) return;

    const index = Math.round(el.scrollLeft / el.clientWidth);
    const cat = categories[index];
    if (cat && cat.id !== activeId.value) {
      activeId.value = cat.id;
    }
  }

  function onSwiperScroll(activeId) {
    readCategoryFromScroll(activeId);
  }

  function initSwiper(activeId) {
    nextTick(() => scrollToCategory(activeId.value, false));
  }

  onUnmounted(() => {
    window.clearTimeout(scrollEndTimer);
  });

  return { swiperRef, onSwiperScroll, scrollToCategory, initSwiper };
}
