import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LoginView from '../views/LoginView.vue';
import AuthCallbackView from '../views/AuthCallbackView.vue';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            redirect: '/dashboard',
        },
        {
            path: '/dashboard',
            name: 'dashboard',
            component: () => import('../views/DashboardView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/projects',
            name: 'projects',
            component: () => import('../views/ProjectsView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/projects/create',
            name: 'create-project',
            component: () => import('../views/CreateProjectView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/projects/:id',
            name: 'project-detail',
            component: () => import('../views/ProjectDetailView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/vulnerabilities',
            name: 'vulnerabilities',
            component: () => import('../views/VulnerabilitiesView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/settings',
            name: 'settings',
            component: () => import('../views/SettingsView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/projects/:projectId/scans/:id',
            name: 'scan-detail',
            component: () => import('../views/ScanDetailView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/login',
            name: 'login',
            component: LoginView,
        },
        {
            path: '/auth/callback',
            name: 'auth-callback',
            component: AuthCallbackView,
        },
    ],
});

router.beforeEach((to, _from, next) => {
    const authStore = useAuthStore();
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        next('/login');
    } else {
        next();
    }
});

export default router;
