<script setup lang="ts">
import { RouterView } from 'vue-router';
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';
import Toaster from './components/ui/Sonner.vue';
import 'vue-sonner/style.css';

const authStore = useAuthStore();

onMounted(async () => {
  // Apply saved theme on mount
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }

  // Restore user session
  if (authStore.isAuthenticated) {
    await authStore.fetchUser();
  }
});
</script>

<template>
  <RouterView />
  <Toaster />
</template>
