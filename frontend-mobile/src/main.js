import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { Capacitor } from '@capacitor/core';
import App from './App.vue';
import router from './router';
import { initSafeArea } from './utils/safeArea';
import { useAppPreferencesStore } from './stores/appPreferences';
import { useAppBackgroundStore } from './stores/appBackground';
import { initSkinModule } from './skin';
import './assets/styles/main.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia).use(router);

async function bootstrap() {
  useAppPreferencesStore(pinia).hydrate();
  await useAppBackgroundStore(pinia).hydrate();
  await initSkinModule(pinia);

  if (Capacitor.isNativePlatform()) {
    await initSafeArea();

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

  app.mount('#app');
}

bootstrap();