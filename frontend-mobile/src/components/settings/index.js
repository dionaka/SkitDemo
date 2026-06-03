/**
 * Settings page section registry.
 * Add new sections here — each lives in its own component file.
 */
import ServerConfigSection from './ServerConfigSection.vue';
import HomeSection from './HomeSection.vue';
import HistorySection from './HistorySection.vue';
import AccountSection from './AccountSection.vue';
import OfflineCacheSection from './OfflineCacheSection.vue';
import AppearanceSection from './AppearanceSection.vue';

export const settingsSections = [
  { id: 'server', component: ServerConfigSection, enabled: true },
  { id: 'home', component: HomeSection, enabled: true },
  { id: 'history', component: HistorySection, enabled: false },
  { id: 'account', component: AccountSection, enabled: true },
  { id: 'offline', component: OfflineCacheSection, enabled: true },
  { id: 'appearance', component: AppearanceSection, enabled: true },
];

export {
  ServerConfigSection,
  HomeSection,
  HistorySection,
  AccountSection,
  OfflineCacheSection,
  AppearanceSection,
};
