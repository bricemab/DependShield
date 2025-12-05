<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';

const { locale } = useI18n();

const toggleLanguage = () => {
  locale.value = locale.value === 'en' ? 'fr' : 'en';
};

const currentLang = computed(() => locale.value === 'en' ? 'EN' : 'FR');
</script>

<template>
  <button
    @click="toggleLanguage"
    class="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
    :title="locale === 'en' ? 'Passer en français' : 'Switch to English'"
  >
    <span class="text-sm font-medium font-mono">{{ currentLang }}</span>
  </button>
</template>
