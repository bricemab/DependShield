<script setup lang="ts">
import { Toaster as Sonner, type ToasterProps } from 'vue-sonner'

const props = defineProps<ToasterProps>()
</script>
<template>
  <Sonner
    class="toaster group"
    richColors
    v-bind="props"
    position="top-center"
    swipe-direction="up"
    :toast-options="{
      classes: {
        toast:
          'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl font-sans',
        description: 'group-[.toast]:text-muted-foreground',
        actionButton:
          'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
        cancelButton:
          'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        error:
          'group-[.toaster]:!bg-red-50 group-[.toaster]:!border-red-200 group-[.toaster]:!text-red-700 group-[.toaster]:!border dark:group-[.toaster]:!bg-red-950 dark:group-[.toaster]:!text-red-400 dark:group-[.toaster]:!border-red-900',
        success:
          'group-[.toaster]:!bg-green-50 group-[.toaster]:!border-green-200 group-[.toaster]:!text-green-700 group-[.toaster]:!border dark:group-[.toaster]:!bg-green-950 dark:group-[.toaster]:!text-green-400 dark:group-[.toaster]:!border-green-900',
      },
    }"
  />
</template>
