import { Capacitor } from '@capacitor/core';

let backExitHandler = null;

export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

export function setFullscreenBackHandler(handler) {
  backExitHandler = handler;
}

/** @returns {boolean} true if back press was consumed */
export function handleAppBackButton() {
  if (backExitHandler) {
    backExitHandler();
    return true;
  }
  return false;
}

/**
 * @param {boolean} portraitVideo - true when video height > width (竖屏短剧)
 */
export async function enterNativePlayerFullscreen(portraitVideo = false) {
  if (!isNativePlatform()) return;

  try {
    const { ScreenOrientation } = await import('@capacitor/screen-orientation');
    await ScreenOrientation.lock({
      orientation: portraitVideo ? 'portrait' : 'landscape',
    });
  } catch {
    // orientation lock optional
  }

  try {
    const { StatusBar } = await import('@capacitor/status-bar');
    await StatusBar.hide();
  } catch {
    // status bar optional
  }
}

export async function exitNativePlayerFullscreen() {
  if (!isNativePlatform()) return;

  setFullscreenBackHandler(null);

  try {
    const { ScreenOrientation } = await import('@capacitor/screen-orientation');
    await ScreenOrientation.lock({ orientation: 'portrait' });
  } catch {
    try {
      const { ScreenOrientation } = await import('@capacitor/screen-orientation');
      await ScreenOrientation.unlock();
    } catch {
      // ignore
    }
  }

  try {
    const { restoreStatusBarAfterFullscreen } = await import('./safeArea');
    await restoreStatusBarAfterFullscreen();
  } catch {
    // ignore
  }
}

export function setBodyFullscreenClass(active) {
  document.body.classList.toggle('video-fullscreen-active', active);
}
