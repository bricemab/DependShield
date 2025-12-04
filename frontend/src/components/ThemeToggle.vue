<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Moon, Sun } from 'lucide-vue-next';

const isDark = ref(false);

onMounted(() => {
  // Check initial theme
  isDark.value = document.documentElement.classList.contains('dark');
});

const toggleDark = () => {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
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
