import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { Capacitor } from '@capacitor/core';
import App from './App.vue';
import router from './router';
import { initSafeArea } from './utils/safeArea';
import { useAppPreferencesStore } from './stores/appPreferences';
import { useAppBackgroundStore } from './stores/appBackground';
import { useOfflineCacheStore } from './stores/offlineCache';
import { useSessionStore } from './stores/session';
import { useSkinStore } from './skin/store/skinStore';
import { hydrateUserCloudAsync } from './services/userCloudSync';
import './assets/styles/main.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia).use(router);

function removeBootSplash() {
  document.getElementById('boot-splash')?.remove();
}

async function hideNativeSplash() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    await SplashScreen.hide({ fadeOutDuration: 280 });
  } catch {
    /* plugin unavailable */
  }
}

function registerNativeBackButton() {
  if (!Capacitor.isNativePlatform()) return;

  import('@capacitor/app').then(({ App: CapApp }) => {
    CapApp.addListener('backButton', async () => {
      const { handleAppBackButton } = await import('./utils/playerFullscreen');
      if (handleAppBackButton()) return;
      if (router.options.history.state.back) {
        router.back();
      } else {
        CapApp.exitApp();
      }
    });
  }).catch(() => {});
}

async function bootstrap() {
  useAppPreferencesStore(pinia).hydrate();
  useOfflineCacheStore(pinia).hydrate();
  useAppBackgroundStore(pinia).hydrate();
  useSkinStore(pinia).hydrate();

  if (Capacitor.isNativePlatform()) {
    await initSafeArea();
    registerNativeBackButton();
  }

  app.mount('#app');
  removeBootSplash();
  await hideNativeSplash();

  const session = useSessionStore(pinia);
  await session.restoreSession();
  hydrateUserCloudAsync().catch(() => {});
}

bootstrap();
