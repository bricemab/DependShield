<script setup lang="ts">
import { RouterView } from 'vue-router';
import { onMounted } from 'vue';

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
</template>
