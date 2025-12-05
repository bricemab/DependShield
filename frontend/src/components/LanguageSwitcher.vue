<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';

const { locale } = useI18n();

const toggleLanguage = () => {
  locale.value = locale.value === 'en' ? 'fr' : 'en';
};

const currentFlag = computed(() => locale.value === 'en' ? '🇬🇧' : '🇫🇷');
</script>

<template>
  <button
    @click="toggleLanguage"
    class="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
    title="Switch Language"
  >
    <span class="text-lg">{{ currentFlag }}</span>
    <span class="text-sm font-medium uppercase">{{ locale }}</span>
  </button>
</template>
