import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { Capacitor } from '@capacitor/core';
import App from './App.vue';
import router from './router';
import { initSafeArea } from './utils/safeArea';
import { useAppBackgroundStore } from './stores/appBackground';
import './assets/styles/main.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia).use(router);

async function bootstrap() {
  await useAppBackgroundStore(pinia).hydrate();

  if (Capacitor.isNativePlatform()) {
    initSafeArea();

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