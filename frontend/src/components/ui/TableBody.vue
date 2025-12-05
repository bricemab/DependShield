<script setup lang="ts">
const props = defineProps<{ class?: string }>()
</script>

<template>
  <tbody :class="['[&_tr:last-child]:border-0', props.class]">
    <slot />
  </tbody>
</template>
