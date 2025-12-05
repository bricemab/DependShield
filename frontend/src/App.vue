<script setup lang="ts">
import { RouterView } from 'vue-router';
import { onMounted } from 'vue';
import Toaster from './components/ui/Sonner.vue';
import 'vue-sonner/style.css';

onMounted(() => {
  // Apply saved theme on mount
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
});
</script>

<template>
  <RouterView />
  <Toaster />
</template>
