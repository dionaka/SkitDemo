import { Capacitor } from '@capacitor/core';

/**
 * Initialize safe-area handling on native platforms.
 * Capacitor 7+ Android 15 edge-to-edge: adjustMarginsForEdgeToEdge in capacitor.config
 * plus CSS var(--safe-top) for page padding.
 */
export async function initSafeArea() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: '#07070d' });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    // StatusBar plugin optional at runtime
  }
}
