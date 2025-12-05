<script setup lang="ts">
const props = defineProps<{ class?: string }>()
</script>

<template>
  <thead :class="['[&_tr]:border-b', props.class]">
    <slot />
  </thead>
</template>
