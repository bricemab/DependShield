<script setup lang="ts">
import { X } from 'lucide-vue-next';

defineProps<{
  show: boolean;
  title?: string;
  description?: string;
}>();

const emit = defineEmits(['close']);
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/50" @click="emit('close')"></div>

      <!-- Panel -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95 translate-y-4"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-95 translate-y-4"
      >
        <div class="relative w-full max-w-lg overflow-hidden rounded-xl bg-background border shadow-xl">
          <!-- Header -->
          <div v-if="title || description" class="flex flex-col space-y-1.5 p-6 pb-4">
            <h3 v-if="title" class="font-semibold leading-none tracking-tight text-lg">{{ title }}</h3>
            <p v-if="description" class="text-sm text-muted-foreground">{{ description }}</p>
          </div>
          
          <button @click="emit('close')" class="absolute right-4 top-4 rounded-sm opcode-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X class="h-4 w-4" />
            <span class="sr-only">Close</span>
          </button>

          <!-- Body -->
          <div class="p-6 pt-0">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="flex items-center justify-end p-6 pt-0 gap-2">
            <slot name="footer" />
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>
