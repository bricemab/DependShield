<script setup lang="ts">
const props = defineProps<{ class?: string }>()
</script>

<template>
  <td :class="['p-4 align-middle [&:has([role=checkbox])]:pr-0', props.class]">
    <slot />
  </td>
</template>
