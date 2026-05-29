import { onMounted, onUnmounted, ref } from 'vue';

/**
 * Track scroll on the app main scroll container (App.vue .app-main).
 */
export function useHomeScroll() {
  const scrollY = ref(0);
  let scrollEl = null;

  function onScroll() {
    scrollY.value = scrollEl?.scrollTop || 0;
  }

  onMounted(() => {
    scrollEl = document.querySelector('.app-main');
    if (!scrollEl) return;
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  });

  onUnmounted(() => {
    scrollEl?.removeEventListener('scroll', onScroll);
  });

  return { scrollY };
}
