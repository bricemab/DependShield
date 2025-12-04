import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useStorage } from '@vueuse/core';
import axios from 'axios';

interface User {
    id: number;
    username: string;
    email: string;
    avatarUrl: string;
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
    }

    async function fetchUser() {
        if (!token.value) return;
        try {
            // TODO: Implement /me endpoint in backend to get user details
            // const response = await axios.get('http://localhost:3000/users/me', {
            //   headers: { Authorization: `Bearer ${token.value}` }
            // });
            // user.value = response.data;
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
