<script setup lang="ts">
import DashboardLayout from '../layouts/DashboardLayout.vue';
import { ShieldAlert } from 'lucide-vue-next';
</script>

<template>
  <DashboardLayout>
    <div class="p-8">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">Vulnerabilities</h2>
          <p class="text-muted-foreground mt-1">Global view of all detected vulnerabilities.</p>
        </div>
      </div>

      <div class="flex flex-col items-center justify-center h-96 border-2 border-dashed rounded-lg">
        <ShieldAlert class="w-12 h-12 text-muted-foreground mb-4" />
        <h3 class="text-lg font-medium">No vulnerabilities found</h3>
        <p class="text-muted-foreground">Or maybe we just haven't implemented this view yet. 😉</p>
      </div>
    </div>
  </DashboardLayout>
</template>
