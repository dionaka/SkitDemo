import { ref, computed, onMounted, onUnmounted } from 'vue';

/** 浏览器事件（不可靠，尤其 Android WebView） */
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);
/** 实际能否连上后端 */
const networkReachable = ref(true);

export function useNetworkStatus() {
  function syncBrowserOnline() {
    isOnline.value = typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  onMounted(() => {
    syncBrowserOnline();
    window.addEventListener('online', syncBrowserOnline);
    window.addEventListener('offline', syncBrowserOnline);
  });

  onUnmounted(() => {
    window.removeEventListener('online', syncBrowserOnline);
    window.removeEventListener('offline', syncBrowserOnline);
  });

  const isEffectivelyOffline = computed(() => !isOnline.value || !networkReachable.value);

  return { isOnline, networkReachable, isEffectivelyOffline };
}

export function getIsOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function isEffectivelyOfflineNow() {
  return !getIsOnline() || !networkReachable.value;
}

/** 探测 API 是否可达（断网 / 服务器不可用时返回 false） */
export async function probeNetworkReachable(apiBase) {
  const base = (apiBase || '').replace(/\/$/, '');
  if (!base) {
    networkReachable.value = true;
    return true;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${base}/api/v1/series?page=1&size=1`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    networkReachable.value = res.ok;
    return res.ok;
  } catch {
    networkReachable.value = false;
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function markNetworkUnreachable() {
  networkReachable.value = false;
}

export function markNetworkReachable() {
  networkReachable.value = true;
}
