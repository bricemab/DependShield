import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useStorage } from '@vueuse/core';
import axios from 'axios';

interface User {
    id: number;
    username: string;
    email: string;
    avatarUrl: string;
    plan: 'STARTER' | 'PRO' | 'ENTERPRISE';
    role?: string;
    isOnboarded?: boolean;
    settings?: {
        theme?: 'light' | 'dark' | 'system';
        language?: 'en' | 'fr';
        notifications?: any;
    };
    organizations?: any[];
}

export const useAuthStore = defineStore('auth', () => {
    const token = useStorage('ds_token', '');
    const user = ref<User | null>(null);

    const isAuthenticated = computed(() => !!token.value);

    function setToken(newToken: string) {
        token.value = newToken;
    }

    function logout() {
        token.value = '';
        user.value = null;
        // Redirect to login handled by component or router
        document.documentElement.classList.remove('dark');
        localStorage.removeItem('theme');
    }

    async function fetchUser() {
        if (!token.value) return;
        try {
            const response = await axios.get('http://localhost:3000/users/me', {
                headers: { Authorization: `Bearer ${token.value}` }
            });
            user.value = response.data;

            // Apply User Settings
            if (user.value?.settings) {
                // Theme
                if (user.value.settings.theme) {
                    const theme = user.value.settings.theme;
                    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    if (isDark) {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                    localStorage.setItem('theme', theme);
                }

                // Language
                if (user.value.settings.language) {
                    localStorage.setItem('locale', user.value.settings.language);
                    // Reloading locale usually requires i18n access, but assuming App.vue watches localStorage or similar
                }
            }

        } catch (error) {
            console.error('Failed to fetch user', error);
            logout();
        }
    }

    return {
        token,
        user,
        isAuthenticated,
        setToken,
        logout,
        fetchUser,
    };
});
