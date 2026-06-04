import { getUserBackgroundOnce } from '@/api/background';
import { useSessionStore } from '@/stores/session';
import { useAppBackgroundStore } from '@/stores/appBackground';
import { useSkinStore } from '@/skin/store/skinStore';
import { clearLegacyBackgroundStorage } from '@/utils/appBackground';

const HYDRATE_TIMEOUT_MS = 3000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('hydrate timeout')), ms);
    }),
  ]);
}

export function applyUserBackgroundPayload(data = {}) {
  useAppBackgroundStore().applyPayload(data);
  useSkinStore().applyPayload(data);
}

export function resetUserCloudLocal() {
  useAppBackgroundStore().resetLocal();
  useSkinStore().resetLocal();
}

export async function hydrateUserCloudAsync() {
  clearLegacyBackgroundStorage();

  const session = useSessionStore();
  if (!session.isLoggedIn) {
    resetUserCloudLocal();
    return null;
  }

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
    resetUserCloudLocal();
    return null;
  } finally {
    bg.loading = false;
    skin.loading = false;
  }
}
