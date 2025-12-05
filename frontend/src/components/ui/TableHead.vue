<script setup lang="ts">
const props = defineProps<{ class?: string }>()
</script>

<template>
  <th :class="['h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0', props.class]">
    <slot />
  </th>
</template>
