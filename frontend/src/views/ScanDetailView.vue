<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useScanStore } from '../stores/scan';

const route = useRoute();
const router = useRouter();
const scanStore = useScanStore();

const scanId = computed(() => parseInt(route.params.id as string));
const filterSeverity = ref('all');

onMounted(async () => {
  await scanStore.fetchScanDetails(scanId.value);
});

const filteredVulnerabilities = computed(() => {
  if (filterSeverity.value === 'all') {
    return scanStore.vulnerabilities;
  }
  return scanStore.vulnerabilities.filter(v => v.severity === filterSeverity.value);
});

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/30 border-red-500';
    case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 border-orange-500';
    case 'moderate': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500';
    case 'low': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 border-blue-500';
    default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 border-gray-500';
  }
};

const severityCounts = computed(() => {
  const counts = { critical: 0, high: 0, moderate: 0, low: 0 };
  scanStore.vulnerabilities.forEach(v => {
    counts[v.severity]++;
  });
  return counts;
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <button @click="router.back()" class="text-gray-400 hover:text-white mb-4 flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 class="text-4xl font-bold text-white mb-2">Scan #{{ scanId }}</h1>
        <p class="text-gray-400">Detailed vulnerability report</p>
      </div>

      <div v-if="scanStore.loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>

      <div v-else-if="scanStore.currentScan">
        <!-- Stats Overview -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div class="bg-gradient-to-br from-red-600/20 to-red-900/20 backdrop-blur-xl rounded-2xl p-6 border border-red-500/30">
            <p class="text-red-400 text-sm mb-1">Critical</p>
            <p class="text-4xl font-bold text-white">{{ severityCounts.critical }}</p>
          </div>
          <div class="bg-gradient-to-br from-orange-600/20 to-orange-900/20 backdrop-blur-xl rounded-2xl p-6 border border-orange-500/30">
            <p class="text-orange-400 text-sm mb-1">High</p>
            <p class="text-4xl font-bold text-white">{{ severityCounts.high }}</p>
          </div>
          <div class="bg-gradient-to-br from-yellow-600/20 to-yellow-900/20 backdrop-blur-xl rounded-2xl p-6 border border-yellow-500/30">
            <p class="text-yellow-400 text-sm mb-1">Moderate</p>
            <p class="text-4xl font-bold text-white">{{ severityCounts.moderate }}</p>
          </div>
          <div class="bg-gradient-to-br from-blue-600/20 to-blue-900/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30">
            <p class="text-blue-400 text-sm mb-1">Low</p>
            <p class="text-4xl font-bold text-white">{{ severityCounts.low }}</p>
          </div>
        </div>

        <!-- Security Score -->
        <div class="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50 mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold text-white mb-2">Security Score</h2>
              <p class="text-gray-400">Overall project security rating</p>
            </div>
            <div class="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
              {{ scanStore.currentScan.score?.toFixed(1) || 'N/A' }}
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 mb-6">
          <div class="flex gap-4">
            <button
              @click="filterSeverity = 'all'"
              :class="filterSeverity === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'"
              class="px-4 py-2 rounded-lg transition-colors"
            >
              All ({{ scanStore.vulnerabilities.length }})
            </button>
            <button
              @click="filterSeverity = 'critical'"
              :class="filterSeverity === 'critical' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'"
              class="px-4 py-2 rounded-lg transition-colors"
            >
              Critical ({{ severityCounts.critical }})
            </button>
            <button
              @click="filterSeverity = 'high'"
              :class="filterSeverity === 'high' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'"
              class="px-4 py-2 rounded-lg transition-colors"
            >
              High ({{ severityCounts.high }})
            </button>
            <button
              @click="filterSeverity = 'moderate'"
              :class="filterSeverity === 'moderate' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300'"
              class="px-4 py-2 rounded-lg transition-colors"
            >
              Moderate ({{ severityCounts.moderate }})
            </button>
            <button
              @click="filterSeverity = 'low'"
              :class="filterSeverity === 'low' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'"
              class="px-4 py-2 rounded-lg transition-colors"
            >
              Low ({{ severityCounts.low }})
            </button>
          </div>
        </div>

        <!-- Vulnerabilities List -->
        <div class="space-y-4">
          <div v-if="filteredVulnerabilities.length === 0" class="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-12 border border-gray-700/50 text-center">
            <p class="text-gray-400">No vulnerabilities found for this filter.</p>
          </div>

          <div
            v-for="vuln in filteredVulnerabilities"
            :key="vuln.id"
            class="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all"
          >
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <span :class="getSeverityColor(vuln.severity)" class="px-3 py-1 rounded-full text-xs font-semibold uppercase border">
                    {{ vuln.severity }}
                  </span>
                  <h3 class="text-xl font-semibold text-white">{{ vuln.title }}</h3>
                </div>
                <p class="text-gray-400 mb-2">
                  <span class="font-mono text-blue-400">{{ vuln.packageName }}</span> @ {{ vuln.version }}
                </p>
                <p class="text-gray-300">{{ vuln.description }}</p>
              </div>
            </div>

            <div class="flex items-center gap-4 text-sm">
              <span v-if="vuln.cve" class="text-gray-400">
                CVE: <span class="font-mono text-white">{{ vuln.cve }}</span>
              </span>
              <a
                v-if="vuln.url"
                :href="vuln.url"
                target="_blank"
                class="text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                View Details
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
