import { defineStore } from 'pinia';
import { getAppPreferences, saveAppPreferences } from '@/utils/appPreferences';
import { clampCategorySwipeSensitivity } from '@/utils/categorySwipeSensitivity';
import { applyImmersiveStatusBar } from '@/utils/safeArea';

export const useAppPreferencesStore = defineStore('appPreferences', {
  state: () => ({
    showContinueWatching: true,
    immersiveStatusBar: false,
    categorySwipeSensitivity: 3,
  }),
  actions: {
    hydrate() {
      const prefs = getAppPreferences();
      this.showContinueWatching = prefs.showContinueWatching;
      this.immersiveStatusBar = prefs.immersiveStatusBar;
      this.categorySwipeSensitivity = prefs.categorySwipeSensitivity;
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
    setCategorySwipeSensitivity(value) {
      this.categorySwipeSensitivity = clampCategorySwipeSensitivity(value);
      saveAppPreferences({ categorySwipeSensitivity: this.categorySwipeSensitivity });
    },
  },
});
