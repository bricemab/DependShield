<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed } from 'vue'

interface CardTitleProps {
  class?: string
}

const props = defineProps<CardTitleProps>()

const titleClass = computed(() => cn('font-semibold leading-none tracking-tight', props.class))
</script>

<template>
  <h3 :class="titleClass">
    <slot />
  </h3>
</template>
