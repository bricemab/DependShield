<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useScanStore } from '../stores/scan';
import { ArrowLeft, AlertTriangle, Eye, EyeOff } from 'lucide-vue-next';
import Card from '../components/ui/Card.vue';
import CardHeader from '../components/ui/CardHeader.vue';
import CardTitle from '../components/ui/CardTitle.vue';
import CardContent from '../components/ui/CardContent.vue';
import ThemeToggle from '../components/ThemeToggle.vue';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';
import DashboardLayout from '../layouts/DashboardLayout.vue';

const route = useRoute();
const router = useRouter();
const scanStore = useScanStore();

const scanId = computed(() => parseInt(route.params.id as string));
const selectedSeverity = ref<string>('all');
const showIgnored = ref(false);
const searchQuery = ref('');

const lastUpdated = ref(new Date());
let pollInterval: any = null;

const startPolling = () => {
  if (pollInterval) return;
  
  console.log('Starting polling for scan status...');
  pollInterval = setInterval(async () => {
    console.log('Polling scan status...', scanStore.currentScan?.status);
    if (scanStore.currentScan?.status === 'running' || scanStore.currentScan?.status === 'pending') {
        await scanStore.fetchScanDetails(scanId.value, true);
        lastUpdated.value = new Date();
    } else {
        console.log('Scan completed or failed, stopping polling.');
        stopPolling();
    }
  }, 5000);
};

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
};

onMounted(async () => {
  await scanStore.fetchScanDetails(scanId.value);
  if (scanStore.currentScan?.status === 'running' || scanStore.currentScan?.status === 'pending') {
      startPolling();
  }
});

onUnmounted(() => {
  stopPolling();
});

const filteredVulnerabilities = computed(() => {
  let vulns = scanStore.vulnerabilities;
  
  if (!showIgnored.value) {
    vulns = vulns.filter(v => !v.whitelisted);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    vulns = vulns.filter(v => v.packageName.toLowerCase().includes(query));
  }

  if (selectedSeverity.value === 'all') {
    return vulns;
  }
  return vulns.filter(v => v.severity === selectedSeverity.value);
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
    if (!v.whitelisted && v.severity in counts) {
      counts[v.severity as keyof typeof counts]++;
    }
  });
  return counts;
});

const handleIgnore = async (vuln: any) => {
  const reason = prompt('Reason for ignoring this vulnerability (optional):');
  if (reason !== null) {
    await scanStore.ignoreVulnerability(scanStore.currentScan!.projectId, vuln, reason);
  }
};

const handleUnignore = async (vuln: any) => {
  if (confirm('Are you sure you want to stop ignoring this vulnerability?')) {
    await scanStore.unignoreVulnerability(scanStore.currentScan!.projectId, vuln);
  }
};
</script>

<template>
  <DashboardLayout>
    <div class="p-8">
      <!-- Header -->
      <div class="flex justify-between items-start mb-8">
        <div>
          <button
            @click="router.back()"
            class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft class="w-4 h-4" />
            {{ $t('common.back') }}
          </button>
          <div class="flex items-center gap-3 mb-2">
            <h2 class="text-3xl font-bold tracking-tight">{{ $t('scan_detail.title', { id: scanId }) }}</h2>
            <div v-if="scanStore.currentScan?.status === 'running'" class="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium border border-blue-200">
              <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700"></div>
              {{ $t('project_detail.scanning') }}
            </div>
            <div v-else-if="scanStore.currentScan?.status === 'pending'" class="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium border border-gray-200">
              {{ $t('scan_detail.pending') }}
            </div>
            <div v-else-if="scanStore.currentScan?.status === 'failed'" class="px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium border border-red-200">
              {{ $t('scan_detail.failed') }}
            </div>
          </div>
          <p class="text-muted-foreground">
            {{ $t('scan_detail.security_score') }}: {{ scanStore.currentScan?.score?.toFixed(1) || 'N/A' }}
            <span class="mx-2">•</span>
            <span class="text-xs">
              {{ $t('scan_detail.last_updated') }}: {{ lastUpdated.toLocaleTimeString() }}
              <span v-if="scanStore.loading" class="ml-2 text-primary animate-pulse">{{ $t('scan_detail.refreshing') }}</span>
            </span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>

        <!-- Severity Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent class="pt-6">
              <div class="text-center">
                <div class="text-3xl font-bold text-red-500">{{ severityCounts.critical }}</div>
                <div class="text-sm text-muted-foreground mt-1">{{ $t('scan_detail.severity.critical') }}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="pt-6">
              <div class="text-center">
                <div class="text-3xl font-bold text-orange-500">{{ severityCounts.high }}</div>
                <div class="text-sm text-muted-foreground mt-1">{{ $t('scan_detail.severity.high') }}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="pt-6">
              <div class="text-center">
                <div class="text-3xl font-bold text-yellow-500">{{ severityCounts.moderate }}</div>
                <div class="text-sm text-muted-foreground mt-1">{{ $t('scan_detail.severity.moderate') }}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent class="pt-6">
              <div class="text-center">
                <div class="text-3xl font-bold text-blue-500">{{ severityCounts.low }}</div>
                <div class="text-sm text-muted-foreground mt-1">{{ $t('scan_detail.severity.low') }}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Filters -->
        <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div class="flex flex-1 gap-4 w-full">
            <div class="relative flex-1 max-w-sm">
                <input
                    type="text"
                    v-model="searchQuery"
                    :placeholder="$t('scan_detail.search_placeholder')"
                    class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
            <div class="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                <button
                @click="selectedSeverity = 'all'"
                :class="selectedSeverity === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'"
                class="px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                >
                {{ $t('common.all') }}
                </button>
                <button
                @click="selectedSeverity = 'critical'"
                :class="selectedSeverity === 'critical' ? 'bg-red-500 text-white' : 'bg-secondary text-secondary-foreground'"
                class="px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                >
                {{ $t('scan_detail.severity.critical') }}
                </button>
                <button
                @click="selectedSeverity = 'high'"
                :class="selectedSeverity === 'high' ? 'bg-orange-500 text-white' : 'bg-secondary text-secondary-foreground'"
                class="px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                >
                {{ $t('scan_detail.severity.high') }}
                </button>
                <button
                @click="selectedSeverity = 'moderate'"
                :class="selectedSeverity === 'moderate' ? 'bg-yellow-500 text-white' : 'bg-secondary text-secondary-foreground'"
                class="px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                >
                {{ $t('scan_detail.severity.moderate') }}
                </button>
                <button
                @click="selectedSeverity = 'low'"
                :class="selectedSeverity === 'low' ? 'bg-blue-500 text-white' : 'bg-secondary text-secondary-foreground'"
                class="px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                >
                {{ $t('scan_detail.severity.low') }}
                </button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              id="showIgnored"
              v-model="showIgnored"
              class="w-4 h-4 rounded border-gray-300"
            />
            <label for="showIgnored" class="text-sm font-medium cursor-pointer whitespace-nowrap">
              {{ $t('scan_detail.show_ignored') }}
            </label>
          </div>
        </div>

        <!-- Vulnerabilities List -->
        <div class="space-y-4">
          <Card v-for="vuln in filteredVulnerabilities" :key="vuln.id" :class="vuln.whitelisted ? 'opacity-60' : ''">
            <CardHeader>
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <AlertTriangle class="w-5 h-5 text-destructive" />
                    <CardTitle class="text-lg">{{ vuln.packageName }}</CardTitle>
                    <span :class="getSeverityColor(vuln.severity)" class="px-2 py-1 rounded-md text-xs font-medium border uppercase">
                      {{ vuln.severity }}
                    </span>
                    <span v-if="vuln.whitelisted" class="px-2 py-1 rounded-md text-xs font-medium bg-gray-200 text-gray-700 border border-gray-300 uppercase">
                      Ignored
                    </span>
                  </div>
                  <p class="text-sm text-muted-foreground">{{ vuln.title }}</p>
                </div>
                <div>
                  <button
                    v-if="!vuln.whitelisted"
                    @click="handleIgnore(vuln)"
                    class="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                    title="Ignore this vulnerability"
                  >
                    <EyeOff class="w-4 h-4" />
                  </button>
                  <button
                    v-else
                    @click="handleUnignore(vuln)"
                    class="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                    title="Un-ignore this vulnerability"
                  >
                    <Eye class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div class="space-y-2 text-sm">
                <div class="flex gap-2">
                  <span class="text-muted-foreground">{{ $t('scan_detail.vulnerable') }}:</span>
                  <span class="font-mono">{{ vuln.version }}</span>
                </div>
                <div v-if="vuln.cve" class="flex gap-2">
                  <span class="text-muted-foreground">CVE:</span>
                  <span>{{ vuln.cve }}</span>
                </div>
                <div v-if="vuln.url" class="mt-2">
                  <a :href="vuln.url" target="_blank" class="text-primary hover:underline text-sm">
                    {{ $t('scan_detail.view_advisory') }} →
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <div v-if="filteredVulnerabilities.length === 0" class="text-center py-12">
            <p class="text-muted-foreground">{{ $t('scan_detail.no_vulnerabilities') }}</p>
          </div>
        </div>
      </div>
    </main>
  </DashboardLayout>
</template>
