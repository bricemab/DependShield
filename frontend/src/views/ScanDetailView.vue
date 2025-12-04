<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useScanStore } from '../stores/scan';
import { FolderGit2, ArrowLeft, AlertTriangle } from 'lucide-vue-next';
import Card from '../components/ui/Card.vue';
import CardHeader from '../components/ui/CardHeader.vue';
import CardTitle from '../components/ui/CardTitle.vue';
import CardContent from '../components/ui/CardContent.vue';
import ThemeToggle from '../components/ThemeToggle.vue';

const route = useRoute();
const router = useRouter();
const scanStore = useScanStore();

const scanId = computed(() => parseInt(route.params.id as string));
const selectedSeverity = ref<string>('all');

onMounted(async () => {
  await scanStore.fetchScanDetails(scanId.value);
});

const filteredVulnerabilities = computed(() => {
  if (selectedSeverity.value === 'all') {
    return scanStore.vulnerabilities;
  }
  return scanStore.vulnerabilities.filter(v => v.severity === selectedSeverity.value);
});

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'moderate': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'low': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
};

const severityCounts = computed(() => {
  const counts = { critical: 0, high: 0, moderate: 0, low: 0 };
  scanStore.vulnerabilities.forEach(v => {
    if (v.severity in counts) counts[v.severity as keyof typeof counts]++;
  });
  return counts;
});
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
            Projects
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
          Logout
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
              @click="router.back()"
              class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft class="w-4 h-4" />
              Back
            </button>
            <h2 class="text-3xl font-bold tracking-tight mb-2">Scan #{{ scanId }}</h2>
            <p class="text-muted-foreground">Security Score: {{ scanStore.currentScan?.score?.toFixed(1) || 'N/A' }}</p>
          </div>
          <ThemeToggle />
        </div>

        <!-- Severity Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent class="pt-6">
              <div class="text-center">
                <div class="text-3xl font-bold text-red-500">{{ severityCounts.critical }}</div>
                <div class="text-sm text-muted-foreground mt-1">Critical</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="pt-6">
              <div class="text-center">
                <div class="text-3xl font-bold text-orange-500">{{ severityCounts.high }}</div>
                <div class="text-sm text-muted-foreground mt-1">High</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="pt-6">
              <div class="text-center">
                <div class="text-3xl font-bold text-yellow-500">{{ severityCounts.moderate }}</div>
                <div class="text-sm text-muted-foreground mt-1">Moderate</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="pt-6">
              <div class="text-center">
                <div class="text-3xl font-bold text-blue-500">{{ severityCounts.low }}</div>
                <div class="text-sm text-muted-foreground mt-1">Low</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Filters -->
        <div class="flex gap-2 mb-6">
          <button
            @click="selectedSeverity = 'all'"
            :class="selectedSeverity === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'"
            class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            All
          </button>
          <button
            @click="selectedSeverity = 'critical'"
            :class="selectedSeverity === 'critical' ? 'bg-red-500 text-white' : 'bg-secondary text-secondary-foreground'"
            class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Critical
          </button>
          <button
            @click="selectedSeverity = 'high'"
            :class="selectedSeverity === 'high' ? 'bg-orange-500 text-white' : 'bg-secondary text-secondary-foreground'"
            class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            High
          </button>
          <button
            @click="selectedSeverity = 'moderate'"
            :class="selectedSeverity === 'moderate' ? 'bg-yellow-500 text-white' : 'bg-secondary text-secondary-foreground'"
            class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Moderate
          </button>
          <button
            @click="selectedSeverity = 'low'"
            :class="selectedSeverity === 'low' ? 'bg-blue-500 text-white' : 'bg-secondary text-secondary-foreground'"
            class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Low
          </button>
        </div>

        <!-- Vulnerabilities List -->
        <div class="space-y-4">
          <Card v-for="vuln in filteredVulnerabilities" :key="vuln.id">
            <CardHeader>
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <AlertTriangle class="w-5 h-5 text-destructive" />
                    <CardTitle class="text-lg">{{ vuln.packageName }}</CardTitle>
                    <span :class="getSeverityColor(vuln.severity)" class="px-2 py-1 rounded-md text-xs font-medium border uppercase">
                      {{ vuln.severity }}
                    </span>
                  </div>
                  <p class="text-sm text-muted-foreground">{{ vuln.title }}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div class="space-y-2 text-sm">
                <div class="flex gap-2">
                  <span class="text-muted-foreground">Vulnerable:</span>
                  <span class="font-mono">{{ vuln.vulnerableVersions }}</span>
                </div>
                <div class="flex gap-2">
                  <span class="text-muted-foreground">Patched:</span>
                  <span class="font-mono">{{ vuln.patchedVersions || 'N/A' }}</span>
                </div>
                <div v-if="vuln.cwe" class="flex gap-2">
                  <span class="text-muted-foreground">CWE:</span>
                  <span>{{ vuln.cwe }}</span>
                </div>
                <div v-if="vuln.url" class="mt-2">
                  <a :href="vuln.url" target="_blank" class="text-primary hover:underline text-sm">
                    View Advisory →
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <div v-if="filteredVulnerabilities.length === 0" class="text-center py-12">
            <p class="text-muted-foreground">No vulnerabilities found for this filter.</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
