<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  size?: 'sm' | 'base' | 'lg'
  shape?: 'circle' | 'square'
}>()

const avatarClass = computed(() => {
  return cn(
    'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
    props.class
  )
})
</script>

<template>
  <div :class="avatarClass">
    <slot />
  </div>
</template>
