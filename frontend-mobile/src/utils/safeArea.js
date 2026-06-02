import { Capacitor } from '@capacitor/core';
import { getAppPreferences } from './appPreferences';

const STATUS_BAR_COLOR = '#07070d';

function applySafeTopCss(immersive) {
  const root = document.documentElement;
  root.classList.toggle('immersive-status-bar', immersive);
  root.classList.toggle('classic-status-bar', !immersive);
  root.style.setProperty('--safe-top', immersive ? 'env(safe-area-inset-top, 0px)' : '0px');
}

export async function applyImmersiveStatusBar(immersive) {
  applySafeTopCss(immersive);

  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    if (immersive) {
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setBackgroundColor({ color: '#00000000' });
    } else {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: STATUS_BAR_COLOR });
    }
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.show();
  } catch {
    // StatusBar plugin optional at runtime
  }
}

export async function restoreStatusBarAfterFullscreen() {
  const immersive = getAppPreferences().immersiveStatusBar;
  await applyImmersiveStatusBar(immersive);
}

/**
 * Initialize safe-area handling on native platforms.
 */
export async function initSafeArea() {
  if (!Capacitor.isNativePlatform()) {
    applySafeTopCss(getAppPreferences().immersiveStatusBar);
    return;
  }

  try {
    const { ScreenOrientation } = await import('@capacitor/screen-orientation');
    await ScreenOrientation.lock({ orientation: 'portrait' });
  } catch {
    // Screen orientation optional at runtime
  }

  await applyImmersiveStatusBar(getAppPreferences().immersiveStatusBar);
}
