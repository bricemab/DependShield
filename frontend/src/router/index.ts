import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import OnboardingView from '../views/OnboardingView.vue';
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
            component: () => import('../layouts/SettingsLayout.vue'),
            meta: { requiresAuth: true },
            children: [
                {
                    path: '',
                    redirect: '/settings/profile',
                },
                {
                    path: 'profile',
                    name: 'settings-profile',
                    component: () => import('../views/settings/SettingsProfileView.vue'),
                },
                {
                    path: 'organization',
                    name: 'settings-organization',
                    component: () => import('../views/settings/SettingsOrganizationView.vue'),
                },
                {
                    path: 'billing',
                    name: 'settings-billing',
                    component: () => import('../views/settings/SettingsBillingView.vue'),
                },
                {
                    path: 'notifications',
                    name: 'settings-notifications',
                    component: () => import('../views/settings/SettingsNotificationsView.vue'),
                },
            ],
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
        {
            path: '/onboarding',
            name: 'onboarding',
            component: OnboardingView,
            meta: { requiresAuth: true },
        },
        {
            path: '/invite/:token',
            name: 'invite-landing',
            component: () => import('../views/InviteLandingView.vue'),
        },
    ],
});

router.beforeEach(async (to, _from, next) => {
    const authStore = useAuthStore();

    // If authenticated (token exists) but user data is missing, fetch it
    if (authStore.isAuthenticated && !authStore.user) {
        try {
            await authStore.fetchUser();
        } catch (error) {
            // Token might be invalid
            authStore.logout();
            next('/login');
            return;
        }
    }

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        next('/login');
    } else if (to.meta.requiresAuth && authStore.isAuthenticated && authStore.user && !authStore.user.isOnboarded && to.name !== 'onboarding') {
        next('/onboarding');
    } else {
        next();
    }
});

export default router;
