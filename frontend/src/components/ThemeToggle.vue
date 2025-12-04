<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Moon, Sun } from 'lucide-vue-next';

const isDark = ref(false);

onMounted(() => {
  // Check initial theme
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    isDark.value = true;
    document.documentElement.classList.add('dark');
  } else {
    isDark.value = false;
    document.documentElement.classList.remove('dark');
  }
});

const toggleDark = () => {
  isDark.value = !isDark.value;
  
  if (isDark.value) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    console.log('Dark mode enabled');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    console.log('Light mode enabled');
  }
  
  // Force a repaint
  document.documentElement.style.display = 'none';
  document.documentElement.offsetHeight; // Trigger reflow
  document.documentElement.style.display = '';
};
</script>

<template>
  <button
    @click="toggleDark"
    class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-9 w-9"
    title="Toggle theme"
  >
    <Sun v-if="isDark" class="w-4 h-4" />
    <Moon v-else class="w-4 h-4" />
  </button>
</template>
