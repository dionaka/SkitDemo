import { Capacitor } from '@capacitor/core';
import { getAppPreferences } from './appPreferences';

const STATUS_BAR_COLOR = '#07070d';

function applySafeTopCss(immersive, topPx = null) {
  const root = document.documentElement;
  root.classList.toggle('immersive-status-bar', immersive);
  root.classList.toggle('classic-status-bar', !immersive);

  if (!immersive) {
    root.style.setProperty('--safe-top', '0px');
    return;
  }

  if (topPx != null && topPx > 0) {
    root.style.setProperty('--safe-top', `${topPx}px`);
  } else {
    root.style.setProperty('--safe-top', 'env(safe-area-inset-top, 28px)');
  }
}

async function syncSafeTopFromStatusBar(immersive) {
  if (!immersive) {
    applySafeTopCss(false);
    return;
  }

  if (!Capacitor.isNativePlatform()) {
    applySafeTopCss(true);
    return;
  }

  try {
    const { StatusBar } = await import('@capacitor/status-bar');
    const info = await StatusBar.getInfo();
    const height = Math.round(Number(info.height) || 0);
    applySafeTopCss(true, height > 0 ? height : null);
  } catch {
    applySafeTopCss(true);
  }
}

export async function applyImmersiveStatusBar(immersive) {
  if (!Capacitor.isNativePlatform()) {
    await syncSafeTopFromStatusBar(immersive);
    return;
  }

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
  } catch (err) {
    console.warn('[status-bar] apply failed:', err?.message || err);
  }

  await syncSafeTopFromStatusBar(immersive);
}

export async function restoreStatusBarAfterFullscreen() {
  await applyImmersiveStatusBar(getAppPreferences().immersiveStatusBar);
}

export async function initSafeArea() {
  const immersive = getAppPreferences().immersiveStatusBar;

  if (Capacitor.isNativePlatform()) {
    try {
      const { ScreenOrientation } = await import('@capacitor/screen-orientation');
      await ScreenOrientation.lock({ orientation: 'portrait' });
    } catch {
      // optional
    }
  }

  await applyImmersiveStatusBar(immersive);
}
