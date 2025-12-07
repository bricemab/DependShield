<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useScanStore } from '../stores/scan';
import { useAuthStore } from '../stores/auth';
import { Eye, EyeOff, Crown, Download, ArrowUp, ArrowDown, ArrowUpDown, Lock, Box, Wand2, ChevronRight, LayoutDashboard, FolderOpen, Activity } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import Card from '../components/ui/Card.vue';
import CardContent from '../components/ui/CardContent.vue';
import Dialog from '../components/ui/Dialog.vue';
import DashboardLayout from '../layouts/DashboardLayout.vue';
import EpssBadge from '../components/EpssBadge.vue';
import DependencyGraph from '../components/DependencyGraph.vue';

const route = useRoute();
const scanStore = useScanStore();
const authStore = useAuthStore();

const canManageWhitelist = computed(() => {
    return authStore.user?.plan === 'PRO' || authStore.user?.plan === 'ENTERPRISE';
});

const scanId = computed(() => parseInt(route.params.id as string));
const projectId = computed(() => parseInt(route.params.projectId as string));
const selectedSeverity = ref<string>('all');
const showIgnored = ref(false);
const searchQuery = ref('');
const sortBy = ref<'severity' | 'epss'>('severity');
const sortOrder = ref<'asc' | 'desc'>('desc');
const currentTab = ref('Vulnerabilities');

const toggleSort = (column: 'severity' | 'epss') => {
  if (sortBy.value === column) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = column;
    sortOrder.value = 'desc';
  }
};

const lastUpdated = ref(new Date());
let pollInterval: any = null;

const startPolling = () => {
  if (pollInterval) return;
  
  console.log('Starting polling for scan status...');
  pollInterval = setInterval(async () => {
    console.log('Polling scan status...', scanStore.currentScan?.status);
    if (scanStore.currentScan?.status === 'running' || scanStore.currentScan?.status === 'pending') {
        await scanStore.fetchScanDetails(projectId.value, scanId.value, true);
        lastUpdated.value = new Date();
    } else {
        console.log('Scan completed or failed, stopping polling.');
        stopPolling();
    }
  }, 1000);
};

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
};

onMounted(async () => {
  await scanStore.fetchScanDetails(projectId.value, scanId.value);
  if (scanStore.currentScan?.status === 'running' || scanStore.currentScan?.status === 'pending') {
      startPolling();
  }
});

onUnmounted(() => {
  stopPolling();
});

const filteredVulnerabilities = computed(() => {
  let vulns = [...scanStore.vulnerabilities];
  
  if (!showIgnored.value) {
    vulns = vulns.filter(v => !v.whitelisted);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    vulns = vulns.filter(v => v.packageName.toLowerCase().includes(query));
  }

  if (selectedSeverity.value !== 'all') {
    vulns = vulns.filter(v => v.severity === selectedSeverity.value);
  }

  return vulns.sort((a, b) => {
    let comparison = 0;
    
    if (sortBy.value === 'severity') {
        const severityOrder: Record<string, number> = { 'critical': 4, 'high': 3, 'moderate': 2, 'low': 1 };
        const orderA = severityOrder[a.severity?.toLowerCase()] || 0;
        const orderB = severityOrder[b.severity?.toLowerCase()] || 0;
        comparison = orderA - orderB;
    } else if (sortBy.value === 'epss') {
        const scoreA = a.epssScore ?? -1;
        const scoreB = b.epssScore ?? -1;
        comparison = scoreA - scoreB;
    }
    
    return sortOrder.value === 'asc' ? comparison : -comparison;
  });
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

const selectedVulnerability = ref<any>(null);
const ignoreReason = ref('');
const showIgnoreModal = ref(false);

const openIgnoreModal = (vuln: any) => {
  selectedVulnerability.value = vuln;
  ignoreReason.value = '';
  showIgnoreModal.value = true;
};

const showFixModal = ref(false);
const selectedFixVuln = ref<any>(null);

const handleFix = (vuln: any) => {
  selectedFixVuln.value = vuln;
  showFixModal.value = true;
};

const confirmFix = async () => {
    if (!selectedFixVuln.value) return;
    const vuln = selectedFixVuln.value;
    showFixModal.value = false;

    const toastId = toast.loading(`Fixing ${vuln.packageName}...`);
    try {
        const result = await scanStore.remediateVulnerability(scanStore.currentScan!.projectId, vuln.id);
        toast.success('Pull Request Created!', { 
            id: toastId,
            action: {
                label: 'View PR',
                onClick: () => window.open(result.prUrl, '_blank')
            }
        });
    } catch (e: any) {
        toast.error(`Fix failed: ${e.response?.data?.message || e.message}`, { id: toastId });
    } finally {
        selectedFixVuln.value = null;
    }
};

const handleConfirmIgnore = async () => {
    if (!selectedVulnerability.value) return;
    
    try {
        await scanStore.ignoreVulnerability(scanStore.currentScan!.projectId, selectedVulnerability.value, ignoreReason.value);
        showIgnoreModal.value = false;
        selectedVulnerability.value = null;
    } catch (e) {
        // toast handled in store
    }
};

const handleUnignore = async (vuln: any) => {
  if (confirm('Are you sure you want to stop ignoring this vulnerability?')) {
    await scanStore.unignoreVulnerability(scanStore.currentScan!.projectId, vuln);
  }
};

const handleExport = async (format: 'pdf' | 'csv') => {
    try {
        await scanStore.downloadReport(scanStore.currentScan!.projectId, format);
        toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (e) {
        toast.error('Failed to export report');
    }
};


import Table from '../components/ui/Table.vue';
import TableBody from '../components/ui/TableBody.vue';
import TableCell from '../components/ui/TableCell.vue';
import TableHead from '../components/ui/TableHead.vue';
import TableHeader from '../components/ui/TableHeader.vue';
import TableRow from '../components/ui/TableRow.vue';

// keep existing logic...
</script>

<template>
  <DashboardLayout>
    <div class="h-full flex flex-col p-8 overflow-hidden">
      <!-- Header with Breadcrumb-like feel and Actions -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <nav class="flex items-center text-sm font-medium text-muted-foreground mb-4 bg-muted/40 px-3 py-1.5 rounded-full w-fit border border-border/40 backdrop-blur-sm">
                <router-link to="/dashboard" class="hover:text-foreground transition-colors flex items-center gap-1">
                    <LayoutDashboard class="w-3.5 h-3.5" />
                </router-link>
                <ChevronRight class="w-3.5 h-3.5 mx-1 text-muted-foreground/50" />
                <router-link to="/projects" class="hover:text-foreground transition-colors">
                    Projects
                </router-link>
                <ChevronRight class="w-3.5 h-3.5 mx-1 text-muted-foreground/50" />
                <router-link :to="`/projects/${projectId}`" class="hover:text-primary transition-colors flex items-center gap-1.5">
                    <FolderOpen class="w-3.5 h-3.5" />
                    {{ scanStore.currentScan?.project?.name || 'Project' }}
                </router-link>
                <ChevronRight class="w-3.5 h-3.5 mx-1 text-muted-foreground/50" />
                <span class="text-foreground/80 flex items-center gap-1.5 cursor-default">
                    <Activity class="w-3.5 h-3.5" />
                    Scan details
                </span>
            </nav>
            <div class="flex items-center gap-3">
                <h2 class="text-3xl font-bold tracking-tight">Scan #{{ scanStore.currentScan?.number || scanId }}</h2>
                <span v-if="scanStore.currentScan?.status === 'running'" class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    Running
                </span>
                <span v-else-if="scanStore.currentScan?.status === 'failed'" class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                    Failed
                </span>
            </div>
            <p class="text-muted-foreground text-sm mt-1">
                {{ lastUpdated.toLocaleDateString() }} {{ lastUpdated.toLocaleTimeString() }} • Score: <span class="font-semibold text-foreground">{{ scanStore.currentScan?.score ? Number(scanStore.currentScan.score).toFixed(1) : 'N/A' }}</span>
            </p>
        </div>

        <div class="flex gap-2">
            <button 
                @click="handleExport('pdf')" 
                class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-background border border-input shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
                <Download class="w-4 h-4" />
                Export PDF
            </button>
            <button 
                @click="handleExport('csv')" 
                class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-background border border-input shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
                <Download class="w-4 h-4" />
                Export CSV
            </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card class="bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/50">
            <CardContent class="p-4 flex flex-col items-center justify-center">
                <span class="text-2xl font-bold text-red-600 dark:text-red-400">{{ severityCounts.critical }}</span>
                <span class="text-xs font-medium text-red-600/80 dark:text-red-400/80 uppercase tracking-wider">Critical</span>
            </CardContent>
          </Card>
          <Card class="bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/50">
            <CardContent class="p-4 flex flex-col items-center justify-center">
                <span class="text-2xl font-bold text-orange-600 dark:text-orange-400">{{ severityCounts.high }}</span>
                <span class="text-xs font-medium text-orange-600/80 dark:text-orange-400/80 uppercase tracking-wider">High</span>
            </CardContent>
          </Card>
          <Card class="bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/50">
            <CardContent class="p-4 flex flex-col items-center justify-center">
                <span class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{{ severityCounts.moderate }}</span>
                <span class="text-xs font-medium text-yellow-600/80 dark:text-yellow-400/80 uppercase tracking-wider">Moderate</span>
            </CardContent>
          </Card>
           <Card class="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/50">
            <CardContent class="p-4 flex flex-col items-center justify-center">
                <span class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ severityCounts.low }}</span>
                <span class="text-xs font-medium text-blue-600/80 dark:text-blue-400/80 uppercase tracking-wider">Low</span>
            </CardContent>
          </Card>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            v-for="tab in ['Vulnerabilities', 'Dependency Graph']"
            :key="tab"
            @click="currentTab = tab"
            :class="[
              currentTab === tab
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
            ]"
          >
            {{ tab }}
          </button>
        </nav>
      </div>

      <!-- Vulnerabilities Tab Content -->
      <div v-if="currentTab === 'Vulnerabilities'" class="h-full flex flex-col overflow-hidden min-h-0">

      <!-- Filters & Actions -->
      <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div class="relative w-full md:w-72">
             <input
                type="text"
                v-model="searchQuery"
                :placeholder="$t('scan_detail.search_placeholder')"
                class="w-full pl-3 pr-10 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          
          <div class="flex items-center gap-4">
             <div class="flex items-center gap-2">
                <input
                type="checkbox"
                id="showIgnored"
                v-model="showIgnored"
                class="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary bg-background"
                />
                <label for="showIgnored" class="text-sm font-medium cursor-pointer">
                {{ $t('scan_detail.show_ignored') }}
                </label>
            </div>
             <select v-model="selectedSeverity" class="h-9 rounded-md border bg-background text-sm px-3 focus:ring-2 focus:ring-primary/50">
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="moderate">Moderate</option>
                <option value="low">Low</option>
            </select>
          </div>
      </div>

      <!-- Data Table -->
      <div class="rounded-md border bg-card flex-1 overflow-auto min-h-0">
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead class="w-[100px] cursor-pointer hover:bg-muted/50 transition-colors" @click="toggleSort('severity')">
                        <div class="flex items-center gap-1">
                            Severity
                            <ArrowUp v-if="sortBy === 'severity' && sortOrder === 'asc'" class="w-3 h-3" />
                            <ArrowDown v-else-if="sortBy === 'severity' && sortOrder === 'desc'" class="w-3 h-3" />
                            <ArrowUpDown v-else class="w-3 h-3 text-muted-foreground/50" />
                        </div>
                      </TableHead>
                      <TableHead class="w-[120px] cursor-pointer hover:bg-muted/50 transition-colors" @click="toggleSort('epss')">
                        <div class="flex items-center gap-1">
                            {{ $t('scan_detail.epss_risk') }}
                            <ArrowUp v-if="sortBy === 'epss' && sortOrder === 'asc'" class="w-3 h-3" />
                            <ArrowDown v-else-if="sortBy === 'epss' && sortOrder === 'desc'" class="w-3 h-3" />
                            <ArrowUpDown v-else class="w-3 h-3 text-muted-foreground/50" />
                        </div>
                      </TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Vulnerability</TableHead>
                      <TableHead class="w-[100px]">Status</TableHead>
                      <TableHead class="text-right">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  <TableRow v-for="vuln in filteredVulnerabilities" :key="vuln.id" :class="vuln.whitelisted ? 'opacity-60 bg-muted/50' : ''">
                      <TableCell>
                          <span :class="['inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border uppercase', getSeverityColor(vuln.severity)]">
                              {{ vuln.severity }}
                          </span>
                      </TableCell>
                      <TableCell>
                           <EpssBadge 
                               v-if="vuln.epssScore !== null && vuln.epssScore !== undefined" 
                               :score="vuln.epssScore" 
                               :percentile="vuln.epssPercentile || 0" 
                           />
                           <span v-else class="text-xs text-muted-foreground">N/A</span>
                      </TableCell>
                      <TableCell>
                          <div class="flex flex-col">
                              <span class="font-medium flex items-center gap-2">
                                <Lock v-if="vuln.type === 'secret' || vuln.packageName === 'Secret Leak'" class="w-4 h-4 text-orange-500" />
                                <Box v-else class="w-4 h-4 text-muted-foreground" />
                                {{ vuln.packageName }}
                                <span v-if="vuln.isDevDependency" class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wide">
                                    DEV
                                </span>
                              </span>
                              <span class="text-xs text-muted-foreground">{{ vuln.version }}</span>
                          </div>
                      </TableCell>
                      <TableCell>
                          <div class="flex flex-col max-w-md">
                              <span class="font-medium truncate" :title="vuln.title">{{ vuln.title }}</span>
                              <div class="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                  <span v-if="vuln.cve">{{ vuln.cve }}</span>
                                  <a v-if="vuln.url" :href="vuln.url" target="_blank" class="text-primary hover:underline flex items-center gap-1">
                                      View Advisory
                                  </a>
                              </div>
                          </div>
                      </TableCell>
                      <TableCell>
                          <span v-if="vuln.whitelisted" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              Ignored
                          </span>
                          <span v-else class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                              Active
                          </span>
                      </TableCell>
                      <TableCell class="text-right">
                       <div class="flex justify-end gap-2">
                                <button
                                    v-if="!vuln.whitelisted"
                                    @click="handleFix(vuln)"
                                    :disabled="!canManageWhitelist"
                                    class="p-2 h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors relative group border border-blue-200"
                                    title="Auto-Fix with AI"
                                >
                                    <Crown v-if="!canManageWhitelist" class="w-3 h-3 absolute -top-1 -right-1 text-amber-500" />
                                    <Wand2 class="w-4 h-4" />
                                </button>
                                <button
                                    v-if="!vuln.whitelisted"
                                    @click="openIgnoreModal(vuln)"
                                    :disabled="!canManageWhitelist"
                                    class="p-2 h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground relative group"
                                    title="Ignore"
                                >
                                    <Crown v-if="!canManageWhitelist" class="w-3 h-3 absolute -top-1 -right-1 text-amber-500" />
                                    <EyeOff class="w-4 h-4" />
                                </button>
                                <button
                                    v-else
                                    @click="handleUnignore(vuln)"
                                    :disabled="!canManageWhitelist"
                                    class="p-2 h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground relative group"
                                    title="Un-ignore"
                                >
                                    <Crown v-if="!canManageWhitelist" class="w-3 h-3 absolute -top-1 -right-1 text-amber-500" />
                                    <Eye class="w-4 h-4" />
                                </button>
                           </div>
                      </TableCell>
                  </TableRow>
                   <TableRow v-if="filteredVulnerabilities.length === 0">
                      <TableCell colspan="5" class="h-24 text-center text-muted-foreground">
                          No vulnerabilities found matching your filters.
                      </TableCell>
                  </TableRow>
              </TableBody>
          </Table>
      </div>
      </div> <!-- End Vulnerabilities Tab -->

      <!-- Dependency Graph Tab -->
      <div v-else-if="currentTab === 'Dependency Graph'" class="mt-6 flex-1 h-full min-h-0 overflow-hidden">
         <DependencyGraph 
            :graph="scanStore.currentScan?.dependencyGraph" 
            :vulnerabilities="scanStore.vulnerabilities" 
         />
      </div>

    <Dialog
      :show="showIgnoreModal"
      title="Ignore Vulnerability"
      description="This will hide the vulnerability from future scans and reports until you un-ignore it."
      @close="showIgnoreModal = false"
    >
      <div class="space-y-4 py-2">
        <div class="space-y-2">
          <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Package
          </label>
          <div class="p-3 rounded-md bg-secondary text-sm font-mono">
             {{ selectedVulnerability?.packageName }} <span v-if="selectedVulnerability?.cve">({{ selectedVulnerability.cve }})</span>
          </div>
        </div>

         <div class="space-y-2">
          <label for="reason" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Reason (Optional)
          </label>
          <textarea
            id="reason"
            v-model="ignoreReason"
            placeholder="e.g. False positive, Mitigation in place..."
            class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          ></textarea>
        </div>
      </div>

      <template #footer>
        <button
          @click="showIgnoreModal = false"
          class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-10 px-4 py-2 hover:bg-secondary text-secondary-foreground"
        >
          Cancel
        </button>
        <button
          @click="handleConfirmIgnore"
          class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Confirm & Ignore
        </button>
      </template>
    </Dialog>

    <Dialog
      :show="showFixModal"
      title="Auto-Fix Vulnerability"
      description="DependShield will automatically attempt to fix this vulnerability."
      @close="showFixModal = false"
    >
      <div class="space-y-4 py-2">
        <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/50">
            <h4 class="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2 mb-2">
                <Wand2 class="w-4 h-4" />
                Remediation Process
            </h4>
            <ol class="list-decimal list-inside text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>Fetch project files from GitHub</li>
                <li>Upgrade <strong>{{ selectedFixVuln?.packageName }}</strong> to latest version</li>
                <li>Create a dedicated fix branch</li>
                <li>Open a Pull Request for your review</li>
            </ol>
        </div>
        
        <div class="space-y-2">
             <label class="text-sm font-medium">Target Package</label>
              <div class="p-3 rounded-md bg-secondary text-sm font-mono flex justify-between items-center">
                 <span class="font-medium">{{ selectedFixVuln?.packageName }}</span>
                 <span class="text-xs px-2 py-0.5 rounded-full bg-background border text-muted-foreground">{{ selectedFixVuln?.version }}</span>
              </div>
        </div>
      </div>

      <template #footer>
        <button
          @click="showFixModal = false"
          class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-10 px-4 py-2 hover:bg-secondary text-secondary-foreground"
        >
          Cancel
        </button>
        <button
          @click="confirmFix"
          class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-10 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
        >
          <Wand2 class="w-4 h-4 mr-2" />
          Create Pull Request
        </button>
      </template>
    </Dialog>
    </div>
  </DashboardLayout>
</template>
