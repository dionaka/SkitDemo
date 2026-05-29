import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  { path: '/', name: 'VideoList', component: () => import('@/views/user/VideoList.vue') },
  {
    path: '/series/:id',
    name: 'SeriesDetail',
    component: () => import('@/views/user/SeriesDetail.vue'),
    meta: { hideChrome: true },
  },
  {
    path: '/play/:id',
    name: 'VideoPlay',
    component: () => import('@/views/user/VideoPlay.vue'),
    meta: { hideChrome: true },
  },
  { path: '/settings', name: 'Settings', component: () => import('@/views/Settings.vue') },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
