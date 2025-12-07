<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import DashboardLayout from '../layouts/DashboardLayout.vue';
import { useDashboardStore } from '../stores/dashboard';
import Card from '../components/ui/Card.vue';
import CardHeader from '../components/ui/CardHeader.vue';
import CardTitle from '../components/ui/CardTitle.vue';
import CardContent from '../components/ui/CardContent.vue';
import Table from '../components/ui/Table.vue';
import TableBody from '../components/ui/TableBody.vue';
import TableCell from '../components/ui/TableCell.vue';
import TableHead from '../components/ui/TableHead.vue';
import TableHeader from '../components/ui/TableHeader.vue';
import TableRow from '../components/ui/TableRow.vue';

import { 
  ShieldAlert, 
  Activity, 
  RefreshCw, 
  ArrowRight,
  Package
} from 'lucide-vue-next';

const dashboardStore = useDashboardStore();
const router = useRouter();

onMounted(() => {
  dashboardStore.fetchStats();
});

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-green-600 dark:text-green-400';
  if (score >= 70) return 'text-blue-600 dark:text-blue-400';
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
</script>

<template>
  <DashboardLayout>
    <div class="p-8 space-y-8">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p class="text-muted-foreground mt-1">Overview of your organization's security posture.</p>
        </div>
        <button 
          @click="dashboardStore.fetchStats()" 
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-white dark:bg-zinc-900 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          :disabled="dashboardStore.isLoading"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': dashboardStore.isLoading }" />
          Refresh
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="dashboardStore.isLoading && !dashboardStore.stats" class="flex items-center justify-center h-64">
         <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="dashboardStore.error" class="p-4 rounded-md bg-red-50 text-red-900 border border-red-200">
         {{ dashboardStore.error }}
      </div>

      <div v-else-if="dashboardStore.stats" class="space-y-8">
          <!-- KPI Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <!-- Total Projects -->
            <Card>
              <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle class="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
                <Package class="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div class="text-2xl font-bold">{{ dashboardStore.stats?.totalProjects ?? 0 }}</div>
                <p class="text-xs text-muted-foreground mt-1">
                   Active monitored repositories
                </p>
              </CardContent>
            </Card>

            <!-- Average Health Score -->
            <Card>
              <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle class="text-sm font-medium text-muted-foreground">Global Health Score</CardTitle>
                <Activity class="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div class="text-2xl font-bold" :class="getScoreColor(dashboardStore.stats?.averageScore ?? 0)">
                    {{ dashboardStore.stats?.averageScore ?? 0 }}/100
                </div>
                <p class="text-xs text-muted-foreground mt-1">Average across all projects</p>
              </CardContent>
            </Card>

            <!-- Total Vulnerabilities -->
            <Card>
              <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle class="text-sm font-medium text-muted-foreground">Active Vulnerabilities</CardTitle>
                <ShieldAlert class="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div class="text-2xl font-bold text-red-600 dark:text-red-400">
                    {{ (dashboardStore.stats?.vulnerabilities?.critical ?? 0) + (dashboardStore.stats?.vulnerabilities?.high ?? 0) }}
                </div>
                <div class="flex gap-2 text-xs mt-1">
                    <span class="text-red-500 font-medium">{{ dashboardStore.stats?.vulnerabilities?.critical ?? 0 }} Critical</span>
                    <span class="text-muted-foreground">•</span>
                    <span class="text-orange-500 font-medium">{{ dashboardStore.stats?.vulnerabilities?.high ?? 0 }} High</span>
                </div>
              </CardContent>
            </Card>

            <!-- Recent Activity Count (Simple Metric) -->
            <Card>
               <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle class="text-sm font-medium text-muted-foreground">Recent Scans</CardTitle>
                <div class="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                 <div class="text-2xl font-bold">{{ dashboardStore.stats?.recentScans?.length ?? 0 }}</div>
                 <p class="text-xs text-muted-foreground mt-1">Scans in the last period</p>
              </CardContent>
            </Card>
          </div>

          <!-- Main Content Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <!-- Projects at Risk -->
              <div class="space-y-4">
                  <div class="flex items-center justify-between">
                      <h3 class="text-lg font-semibold tracking-tight">Projects at Risk</h3>
                      <button @click="router.push('/projects')" class="text-sm text-primary hover:underline flex items-center gap-1">
                          View all <ArrowRight class="w-4 h-4" />
                      </button>
                  </div>
                  <div class="rounded-lg border bg-card">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Project</TableHead>
                                  <TableHead>Score</TableHead>
                                  <TableHead class="text-right">Vulns</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              <TableRow 
                                v-for="project in dashboardStore.stats?.riskyProjects ?? []" 
                                :key="project.id"
                                class="cursor-pointer hover:bg-muted/50"
                                @click="router.push(`/projects/${project.id}`)"
                              >
                                  <TableCell class="font-medium">
                                      {{ project.name }}
                                      <div class="text-xs text-muted-foreground">{{ project.repositoryName }}</div>
                                  </TableCell>
                                  <TableCell>
                                      <div class="font-bold" :class="getScoreColor(project.score)">
                                          {{ project.score }}/100
                                      </div>
                                  </TableCell>
                                  <TableCell class="text-right">
                                      <div class="flex justify-end gap-2 text-xs font-mono">
                                          <span v-if="project.criticalCount > 0" class="text-red-600 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">{{ project.criticalCount }}C</span>
                                          <span v-if="project.highCount > 0" class="text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded">{{ project.highCount }}H</span>
                                      </div>
                                  </TableCell>
                              </TableRow>
                              <TableRow v-if="(dashboardStore.stats?.riskyProjects?.length ?? 0) === 0">
                                  <TableCell colspan="3" class="text-center py-8 text-muted-foreground">
                                      No risky projects found. Great job! 🎉
                                  </TableCell>
                              </TableRow>
                          </TableBody>
                      </Table>
                  </div>
              </div>

              <!-- Recent Scans -->
              <div class="space-y-4">
                  <div class="flex items-center justify-between">
                      <h3 class="text-lg font-semibold tracking-tight">Recent Scans</h3>
                  </div>
                   <div class="rounded-lg border bg-card">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Project</TableHead>
                                  <TableHead>Scan</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead class="text-right">Time</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              <TableRow 
                                v-for="scan in dashboardStore.stats?.recentScans ?? []" 
                                :key="scan.id"
                                class="cursor-pointer hover:bg-muted/50"
                                @click="router.push(`/projects/${scan.projectId}/scans/${scan.id}`)"
                              >
                                  <TableCell class="font-medium">{{ scan.projectName }}</TableCell>
                                  <TableCell>#{{ scan.number || scan.id }}</TableCell>
                                  <TableCell>
                                      <span 
                                        class="px-2 py-0.5 rounded-full text-xs font-medium border uppercase"
                                        :class="{
                                            'bg-green-100 text-green-800 border-green-200': scan.status === 'completed',
                                            'bg-red-100 text-red-800 border-red-200': scan.status === 'failed',
                                            'bg-blue-100 text-blue-800 border-blue-200': scan.status === 'running' || scan.status === 'pending'
                                        }"
                                      >
                                          {{ scan.status }}
                                      </span>
                                  </TableCell>
                                  <TableCell class="text-right text-xs text-muted-foreground">
                                      {{ formatDate(scan.startedAt) }}
                                  </TableCell>
                              </TableRow>
                              <TableRow v-if="(dashboardStore.stats?.recentScans?.length ?? 0) === 0">
                                  <TableCell colspan="4" class="text-center py-8 text-muted-foreground">
                                      No recent activity.
                                  </TableCell>
                              </TableRow>
                          </TableBody>
                      </Table>
                  </div>
              </div>
          </div>
      </div>
    </div>
  </DashboardLayout>
</template>
