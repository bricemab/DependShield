<script setup lang="ts">
import DashboardLayout from '../layouts/DashboardLayout.vue';
import Card from '../components/ui/Card.vue';
import CardHeader from '../components/ui/CardHeader.vue';
import CardTitle from '../components/ui/CardTitle.vue';
import CardContent from '../components/ui/CardContent.vue';
import { LayoutDashboard } from 'lucide-vue-next';
</script>

<template>
  <DashboardLayout>
    <div class="p-8">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p class="text-muted-foreground mt-1">Overview of your organization's security posture.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Total Projects</CardTitle>
            <LayoutDashboard class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">12</div>
            <p class="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>
        <!-- Add more placeholder stats here -->
      </div>
      
      <div class="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
        <p class="text-muted-foreground">Charts and graphs coming soon...</p>
      </div>
    </div>
  </DashboardLayout>
</template>
