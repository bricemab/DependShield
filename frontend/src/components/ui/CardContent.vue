<script setup lang="ts">
import { cn } from '@/lib/utils'
import { computed } from 'vue'

interface CardContentProps {
  class?: string
}

const props = defineProps<CardContentProps>()

const contentClass = computed(() => cn('p-6 pt-0', props.class))
</script>

<template>
  <div :class="contentClass">
    <slot />
  </div>
</template>
