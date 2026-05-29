/**
 * Settings page section registry.
 * Add new sections here — each lives in its own component file.
 */
import ServerConfigSection from './ServerConfigSection.vue';
import HistorySection from './HistorySection.vue';
import AccountSection from './AccountSection.vue';
import OfflineCacheSection from './OfflineCacheSection.vue';
import AppearanceSection from './AppearanceSection.vue';

export const settingsSections = [
  { id: 'server', component: ServerConfigSection, enabled: true },
  { id: 'history', component: HistorySection, enabled: false },
  { id: 'account', component: AccountSection, enabled: false },
  { id: 'offline', component: OfflineCacheSection, enabled: false },
  { id: 'appearance', component: AppearanceSection, enabled: false },
];

export {
  ServerConfigSection,
  HistorySection,
  AccountSection,
  OfflineCacheSection,
  AppearanceSection,
};
