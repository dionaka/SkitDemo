import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', name: 'VideoList', component: () => import('@/views/user/VideoList.vue') },
  { path: '/play/:id', name: 'VideoPlay', component: () => import('@/views/user/VideoPlay.vue') },
  { path: '/admin/login', name: 'AdminLogin', component: () => import('@/views/admin/Login.vue') },
  {
    path: '/admin/videos',
    name: 'VideoManage',
    component: () => import('@/views/admin/VideoManage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin/highlights/:videoId',
    name: 'HighlightManage',
    component: () => import('@/views/admin/HighlightManage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin/settings',
    name: 'ApiSettings',
    component: () => import('@/views/admin/ApiSettings.vue'),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to, _from, next) => {
  if (to.meta.requiresAuth && !localStorage.getItem('admin_token')) {
    next('/admin/login');
  } else {
    next();
  }
});

export default router;
