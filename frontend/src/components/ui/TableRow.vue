<script setup lang="ts">
const props = defineProps<{ class?: string }>()
</script>

<template>
  <tr :class="['border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', props.class]">
    <slot />
  </tr>
</template>
