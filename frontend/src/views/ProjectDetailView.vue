<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project';
import { useScanStore } from '../stores/scan';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const scanStore = useScanStore();
const authStore = useAuthStore();

const projectId = computed(() => parseInt(route.params.id as string));
const project = computed(() => projectStore.projects.find(p => p.id === projectId.value));

onMounted(async () => {
  if (!project.value) {
    await projectStore.fetchProjects();
  }
  await scanStore.fetchScans(projectId.value);
});

const handleTriggerScan = async () => {
  try {
    await scanStore.triggerScan(projectId.value);
    await scanStore.fetchScans(projectId.value);
  } catch (error) {
    alert('Failed to trigger scan');
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
    case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
    case 'moderate': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    case 'low': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
    default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    case 'running': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
    case 'failed': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
    default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
  }
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleString();
};
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <button @click="router.push('/projects')" class="text-gray-400 hover:text-white mb-4 flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Projects
          </button>
          <h1 class="text-4xl font-bold text-white mb-2">{{ project?.name }}</h1>
          <p class="text-gray-400">{{ project?.repositoryName }} • {{ project?.branch }}</p>
        </div>
        <div class="flex gap-4">
          <button
            @click="handleTriggerScan"
            :disabled="scanStore.loading"
            class="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg v-if="!scanStore.loading" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <div v-else class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            {{ scanStore.loading ? 'Scanning...' : 'Run Scan Now' }}
          </button>
          <button
            @click="authStore.logout(); router.push('/login')"
            class="px-4 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm mb-1">Total Scans</p>
              <p class="text-3xl font-bold text-white">{{ scanStore.scans.length }}</p>
            </div>
            <div class="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm mb-1">Latest Score</p>
              <p class="text-3xl font-bold text-white">{{ scanStore.scans[0]?.score?.toFixed(1) || 'N/A' }}</p>
            </div>
            <div class="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm mb-1">Package Manager</p>
              <p class="text-3xl font-bold text-white uppercase">{{ project?.packageManager }}</p>
            </div>
            <div class="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Scan History -->
      <div class="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 overflow-hidden">
        <div class="p-6 border-b border-gray-700/50">
          <h2 class="text-2xl font-bold text-white">Scan History</h2>
        </div>

        <div v-if="scanStore.loading" class="p-12 text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>

        <div v-else-if="scanStore.scans.length === 0" class="p-12 text-center">
          <p class="text-gray-400 mb-4">No scans yet. Run your first scan!</p>
          <button
            @click="handleTriggerScan"
            class="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            Run First Scan
          </button>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-900/50">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Vulnerabilities</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Score</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Started At</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700/50">
              <tr v-for="scan in scanStore.scans" :key="scan.id" class="hover:bg-gray-700/30 transition-colors">
                <td class="px-6 py-4 text-sm text-white font-mono">#{{ scan.id }}</td>
                <td class="px-6 py-4">
                  <span :class="getStatusColor(scan.status)" class="px-3 py-1 rounded-full text-xs font-semibold uppercase">
                    {{ scan.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-white">{{ scan.vulnerabilitiesCount || 0 }}</td>
                <td class="px-6 py-4">
                  <span class="text-lg font-bold text-white">{{ scan.score?.toFixed(1) || 'N/A' }}</span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-400">{{ formatDate(scan.startedAt) }}</td>
                <td class="px-6 py-4">
                  <button
                    @click="router.push(`/scans/${scan.id}`)"
                    class="text-blue-400 hover:text-blue-300 text-sm font-medium"
                  >
                    View Details →
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
