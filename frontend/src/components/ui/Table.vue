<script setup lang="ts">


const props = defineProps<{ class?: string }>()
</script>

<template>
  <div class="relative w-full overflow-auto">
    <table :class="['w-full caption-bottom text-sm', props.class]">
      <slot />
    </table>
  </div>
</template>
