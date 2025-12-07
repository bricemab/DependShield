<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

onMounted(async () => {
  const token = route.query.token as string;
  if (token) {
    authStore.setToken(token);
    await authStore.fetchUser(); // Wait for user fetch to ensure auth state is ready
    
    // Check for pending invitation
    const pendingInvite = localStorage.getItem('pending_invite');
    if (pendingInvite) {
        localStorage.removeItem('pending_invite');
        router.push(`/invite/${pendingInvite}`);
    } else {
        router.push('/');
    }
  } else {
    router.push('/login');
  }
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    <span class="ml-3">Authenticating...</span>
  </div>
</template>
