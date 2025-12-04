<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

onMounted(() => {
  const token = route.query.token as string;
  if (token) {
    authStore.setToken(token);
    // authStore.fetchUser(); // Fetch user details after setting token
    router.push('/');
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
