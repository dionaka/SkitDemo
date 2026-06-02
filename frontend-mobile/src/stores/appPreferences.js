import { defineStore } from 'pinia';
import { getAppPreferences, saveAppPreferences } from '@/utils/appPreferences';
import { applyImmersiveStatusBar } from '@/utils/safeArea';

export const useAppPreferencesStore = defineStore('appPreferences', {
  state: () => ({
    showContinueWatching: true,
    immersiveStatusBar: false,
  }),
  actions: {
    hydrate() {
      const prefs = getAppPreferences();
      this.showContinueWatching = prefs.showContinueWatching;
      this.immersiveStatusBar = prefs.immersiveStatusBar;
    },
    setShowContinueWatching(value) {
      this.showContinueWatching = Boolean(value);
      saveAppPreferences({ showContinueWatching: this.showContinueWatching });
    },
    async setImmersiveStatusBar(value) {
      this.immersiveStatusBar = Boolean(value);
      saveAppPreferences({ immersiveStatusBar: this.immersiveStatusBar });
      await applyImmersiveStatusBar(this.immersiveStatusBar);
    },
  },
});
