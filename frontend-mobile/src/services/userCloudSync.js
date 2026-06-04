import { getUserBackgroundOnce } from '@/api/background';
import { useSessionStore } from '@/stores/session';
import { useAppBackgroundStore } from '@/stores/appBackground';
import { useSkinStore } from '@/skin/store/skinStore';
import { clearLegacyBackgroundStorage } from '@/utils/appBackground';
import {
  applyAppearanceCache,
  clearAppearanceCache,
  schedulePersistAppearanceCache,
} from '@/services/userAppearanceCache';

const HYDRATE_TIMEOUT_MS = 3000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('hydrate timeout')), ms);
    }),
  ]);
}

export function applyUserBackgroundPayload(data = {}, options = {}) {
  useAppBackgroundStore().applyPayload(data);
  useSkinStore().applyPayload(data);
  if (options.persistCache !== false && data && typeof data === 'object') {
    schedulePersistAppearanceCache(data);
  }
}

export function resetUserCloudLocal() {
  useAppBackgroundStore().resetLocal();
  useSkinStore().resetLocal();
}

export async function hydrateUserCloudAsync() {
  clearLegacyBackgroundStorage();

  const session = useSessionStore();
  if (!session.isLoggedIn) {
    if (session.userId) clearAppearanceCache(session.userId);
    resetUserCloudLocal();
    return null;
  }

  applyAppearanceCache(session.userId);

  const bg = useAppBackgroundStore();
  const skin = useSkinStore();
  bg.loading = true;
  skin.loading = true;

  try {
    const data = await withTimeout(
      getUserBackgroundOnce(session.userSessionId),
      HYDRATE_TIMEOUT_MS,
    );
    applyUserBackgroundPayload(data);
    return data;
  } catch {
    return null;
  } finally {
    bg.loading = false;
    skin.loading = false;
  }
}
