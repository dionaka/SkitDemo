import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  { path: '/', name: 'VideoList', component: () => import('@/views/user/VideoList.vue'), meta: { homeLayout: true } },
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
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/views/user/Search.vue'),
    meta: { hideChrome: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/user/Login.vue'),
    meta: { hideChrome: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/user/Profile.vue'),
    meta: { hideChrome: true },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
