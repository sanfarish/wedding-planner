import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    title?: string
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { public: true, title: 'Sign in' },
  },
  {
    path: '/',
    component: AppLayout,
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      { path: 'dashboard', name: 'dashboard', component: () => import('@/pages/DashboardPage.vue'), meta: { title: 'Dashboard' } },
      { path: 'tasks', name: 'tasks', component: () => import('@/pages/TasksPage.vue'), meta: { title: 'Tasks' } },
      { path: 'budget', name: 'budget', component: () => import('@/pages/BudgetPage.vue'), meta: { title: 'Budget' } },
      { path: 'guests', name: 'guests', component: () => import('@/pages/GuestsPage.vue'), meta: { title: 'Guests' } },
      { path: 'vendors', name: 'vendors', component: () => import('@/pages/VendorsPage.vue'), meta: { title: 'Vendors' } },
      { path: 'timeline', name: 'timeline', component: () => import('@/pages/TimelinePage.vue'), meta: { title: 'Timeline' } },
      { path: 'notes', name: 'notes', component: () => import('@/pages/NotesPage.vue'), meta: { title: 'Notes' } },
      { path: 'documents', name: 'documents', component: () => import('@/pages/DocumentsPage.vue'), meta: { title: 'Documents' } },
      { path: 'activity', name: 'activity', component: () => import('@/pages/ActivityPage.vue'), meta: { title: 'Activity' } },
      { path: 'settings', name: 'settings', component: () => import('@/pages/SettingsPage.vue'), meta: { title: 'Settings' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()

  if (to.meta.public) {
    return auth.isAuthenticated && to.name === 'login' ? { name: 'dashboard' } : true
  }

  if (!auth.isAuthenticated) {
    const keepRedirect = to.fullPath !== '/' && to.fullPath !== '/dashboard'
    return { name: 'login', query: keepRedirect ? { redirect: to.fullPath } : {} }
  }

  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Our Wedding` : 'Our Wedding'
})
