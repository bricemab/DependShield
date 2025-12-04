<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

interface CardProps {
  class?: string
}

const props = defineProps<CardProps>()

const cardClass = computed(() => cn(
  'rounded-xl border bg-card text-card-foreground shadow',
  props.class
))
</script>

<template>
  <div :class="cardClass">
    <slot />
  </div>
</template>
