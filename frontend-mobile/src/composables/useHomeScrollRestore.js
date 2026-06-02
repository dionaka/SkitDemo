import { onMounted, onBeforeUnmount, onActivated, onDeactivated, nextTick } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';

function getHomeScrollEl() {
  return document.querySelector('.app-main') || document.scrollingElement;
}

let savedScrollTop = 0;

/** 离开首页前记录滚动位置 */
export function captureHomeScroll() {
  const el = getHomeScrollEl();
  if (el) savedScrollTop = el.scrollTop;
}

/** 点首页 Tab 回顶后清除快照，避免之后误恢复旧位置 */
export function clearHomeScrollSnapshot() {
  savedScrollTop = 0;
}

/** 回到首页后恢复滚动位置 */
export function restoreHomeScroll() {
  if (savedScrollTop <= 0) return;

  const apply = () => {
    const el = getHomeScrollEl();
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
    el.scrollTop = Math.min(savedScrollTop, maxScroll);
  };

  nextTick(() => {
    requestAnimationFrame(() => {
      apply();
      requestAnimationFrame(apply);
    });
  });
}

/**
 * 首页滚动位置记忆：进入短剧等子页面前保存，返回后恢复。
 */
export function useHomeScrollRestore() {
  onBeforeRouteLeave(() => {
    captureHomeScroll();
  });

  onBeforeUnmount(() => {
    captureHomeScroll();
  });

  onDeactivated(() => {
    captureHomeScroll();
  });

  onActivated(() => {
    restoreHomeScroll();
  });

  onMounted(() => {
    restoreHomeScroll();
  });
}
