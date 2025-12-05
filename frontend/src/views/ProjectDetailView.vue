<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project';
import { useScanStore } from '../stores/scan';
import { FolderGit2, Play, ArrowLeft, FileText, Shield, Package2 } from 'lucide-vue-next';
import Card from '../components/ui/Card.vue';
import CardHeader from '../components/ui/CardHeader.vue';
import CardTitle from '../components/ui/CardTitle.vue';
import CardContent from '../components/ui/CardContent.vue';
import ThemeToggle from '../components/ThemeToggle.vue';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const scanStore = useScanStore();

const projectId = computed(() => parseInt(route.params.id as string));
const project = computed(() => projectStore.projects.find(p => p.id === projectId.value));

onMounted(async () => {
  if (!project.value) {
    await projectStore.fetchProjects();
  }
  await scanStore.fetchScans(projectId.value);
  checkPolling();
});

onUnmounted(() => {
  stopPolling();
});

let pollInterval: any = null;

const startPolling = () => {
  if (pollInterval) return;
  
  pollInterval = setInterval(async () => {
    await scanStore.fetchScans(projectId.value, true);
    checkPolling();
  }, 5000);
};

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
};

const checkPolling = () => {
  const hasRunningScans = scanStore.scans.some(s => s.status === 'running' || s.status === 'pending');
  if (hasRunningScans) {
    startPolling();
  } else {
    stopPolling();
  }
};

const handleTriggerScan = async () => {
  try {
    await scanStore.triggerScan(projectId.value);
    await scanStore.fetchScans(projectId.value);
    startPolling();
  } catch (error) {
    alert('Failed to trigger scan');
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'running': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'failed': return 'bg-red-500/10 text-red-500 border-red-500/20';
    default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleString();
};

const settingsForm = ref({
  cronSchedule: '',
  emailEnabled: false,
});

const isSettingsLoading = ref(false);

// Initialize form when project is loaded
const initSettingsForm = () => {
  if (project.value) {
    settingsForm.value = {
      cronSchedule: project.value.cronSchedule || '',
      emailEnabled: project.value.emailEnabled || false,
    };
  }
};

onMounted(async () => {
  if (!project.value) {
    await projectStore.fetchProjects();
  }
  await scanStore.fetchScans(projectId.value);
  initSettingsForm();
});

const handleUpdateSettings = async () => {
  if (!project.value) return;
  
  isSettingsLoading.value = true;
  try {
    await projectStore.updateProject(project.value.id, settingsForm.value);
    alert('Settings updated successfully');
  } catch (error) {
    alert('Failed to update settings');
  } finally {
    isSettingsLoading.value = false;
  }
};
</script>

<template>
  <div class="flex h-screen bg-background">
    <!-- Sidebar -->
    <aside class="w-64 border-r bg-card flex flex-col">
      <div class="p-6 border-b">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <FolderGit2 class="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 class="text-lg font-bold">DependShield</h1>
            <p class="text-xs text-muted-foreground">Vulnerability Scanner</p>
          </div>
        </div>
      </div>

      <nav class="flex-1 p-4">
        <div class="space-y-1">
          <router-link
            to="/projects"
            class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <FolderGit2 class="w-4 h-4" />
            {{ $t('projects.title') }}
          </router-link>
        </div>
      </nav>

      <div class="p-4 border-t">
        <button
          @click="$router.push('/login')"
          class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {{ $t('common.logout') }}
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto">
      <div class="p-8">
        <!-- Header -->
        <div class="flex justify-between items-start mb-8">
          <div>
            <button
              @click="router.push('/projects')"
              class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft class="w-4 h-4" />
              {{ $t('project_detail.back_to_projects') }}
            </button>
            <h2 class="text-3xl font-bold tracking-tight mb-2">{{ project?.name }}</h2>
            <p class="text-muted-foreground">{{ project?.repositoryName }} • {{ project?.branch }}</p>
          </div>
          <div class="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              @click="handleTriggerScan"
              :disabled="scanStore.loading"
              class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2 disabled:opacity-50"
            >
              <Play v-if="!scanStore.loading" class="w-4 h-4" />
              <div v-else class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
              {{ scanStore.loading ? $t('project_detail.scanning') : $t('project_detail.run_scan') }}
            </button>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader class="flex flex-row items-center justify-between pb-2">
              <CardTitle class="text-sm font-medium text-muted-foreground">{{ $t('project_detail.total_scans') }}</CardTitle>
              <FileText class="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">{{ scanStore.scans.length }}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="flex flex-row items-center justify-between pb-2">
              <CardTitle class="text-sm font-medium text-muted-foreground">{{ $t('project_detail.latest_score') }}</CardTitle>
              <Shield class="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">{{ scanStore.scans[0]?.score?.toFixed(1) || 'N/A' }}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="flex flex-row items-center justify-between pb-2">
              <CardTitle class="text-sm font-medium text-muted-foreground">{{ $t('project_detail.package_manager') }}</CardTitle>
              <Package2 class="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold uppercase">{{ project?.packageManager }}</div>
            </CardContent>
          </Card>
        </div>

        <!-- Scan History -->
        <Card>
          <CardHeader>
            <CardTitle>{{ $t('project_detail.scan_history') }}</CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="scanStore.loading" class="flex items-center justify-center py-12">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>

            <div v-else-if="scanStore.scans.length === 0" class="text-center py-12">
              <p class="text-muted-foreground mb-4">{{ $t('project_detail.no_scans') }}</p>
              <button
                @click="handleTriggerScan"
                class="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                {{ $t('project_detail.run_first_scan') }}
              </button>
            </div>

            <div v-else class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b">
                    <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">ID</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{{ $t('common.status') }}</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{{ $t('projects.columns.vulnerabilities') }}</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{{ $t('projects.columns.score') }}</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{{ $t('project_detail.cron_schedule') }}</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{{ $t('common.actions') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr v-for="scan in scanStore.scans" :key="scan.id" class="hover:bg-muted/50">
                    <td class="px-4 py-3 text-sm font-mono">#{{ scan.id }}</td>
                    <td class="px-4 py-3">
                      <span :class="getStatusColor(scan.status)" class="px-2 py-1 rounded-md text-xs font-medium border inline-flex items-center gap-2">
                        <div v-if="scan.status === 'running'" class="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                        {{ scan.status }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-sm">{{ scan.vulnerabilitiesCount || 0 }}</td>
                    <td class="px-4 py-3 text-sm font-bold">{{ scan.score?.toFixed(1) || 'N/A' }}</td>
                    <td class="px-4 py-3 text-sm text-muted-foreground">{{ formatDate(scan.startedAt) }}</td>
                    <td class="px-4 py-3">
                      <button
                        @click="router.push(`/scans/${scan.id}`)"
                        class="text-sm text-primary hover:underline"
                      >
                        {{ $t('common.actions') }} →
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <!-- Configuration -->
        <Card class="mt-8">
          <CardHeader>
            <CardTitle>{{ $t('project_detail.configuration') }}</CardTitle>
          </CardHeader>
          <CardContent>
            <form @submit.prevent="handleUpdateSettings" class="space-y-6 max-w-md">
              <div class="space-y-2">
                <label class="text-sm font-medium">{{ $t('project_detail.cron_schedule') }}</label>
                <input
                  v-model="settingsForm.cronSchedule"
                  type="text"
                  placeholder="0 0 * * *"
                  class="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p class="text-xs text-muted-foreground">Daily at midnight: 0 0 * * *</p>
              </div>

              <div class="flex items-center gap-2">
                <input
                  v-model="settingsForm.emailEnabled"
                  type="checkbox"
                  id="emailEnabled"
                  class="w-4 h-4 rounded border-gray-300"
                />
                <label for="emailEnabled" class="text-sm">
                  {{ $t('project_detail.enable_email') }}
                </label>
              </div>

              <button
                type="submit"
                :disabled="isSettingsLoading"
                class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50"
              >
                {{ isSettingsLoading ? $t('project_detail.saving') : $t('project_detail.save_changes') }}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  </div>
</template>
