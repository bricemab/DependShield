<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project';
import { useScanStore } from '../stores/scan';
import { Play, ArrowLeft, FileText, Shield, Package2, Trash2, LayoutDashboard, List, Settings, EyeOff, GitBranch, ChevronRight, Clock } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import Card from '../components/ui/Card.vue';
import CardHeader from '../components/ui/CardHeader.vue';
import CardTitle from '../components/ui/CardTitle.vue';
import CardContent from '../components/ui/CardContent.vue';
import DashboardLayout from '../layouts/DashboardLayout.vue';

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const scanStore = useScanStore();

const projectId = computed(() => parseInt(route.params.id as string));
const project = computed(() => projectStore.projects.find(p => p.id === projectId.value));

const activeTab = ref('overview');

const settingsForm = ref({
  cronSchedule: '',
  emailEnabled: false,
  qualityGate: {
      minScore: 0,
      failOnSeverity: '',
  }
});
const isSettingsLoading = ref(false);



onMounted(async () => {
  if (!project.value) {
    await projectStore.fetchProjects();
  }
  await scanStore.fetchScans(projectId.value);
  await projectStore.fetchWhitelistRules(projectId.value);
  initSettingsForm();
  checkPolling();
});

onUnmounted(() => {
  stopPolling();
});

let pollInterval: any = null;

const handlePageChange = async (page: number) => {
  if (page < 1 || page > scanStore.pagination.totalPages) return;
  await scanStore.fetchScans(projectId.value, false, page);
};

const startPolling = () => {
  if (pollInterval) return;
  
  pollInterval = setInterval(async () => {
    await scanStore.fetchScans(projectId.value, true, scanStore.pagination.page);
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
    toast.success('Scan triggered successfully');
    await scanStore.fetchScans(projectId.value);
    startPolling();
  } catch (error: any) {
    toast.error('Failed to trigger scan', {
        description: error.response?.data?.message || 'Check cooldowns.'
    });
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

// --- Statistics & Charts ---
const latestScanId = computed(() => {
    // Priority: First 'completed' scan. If none, then first scan ever (even if failed/running to show something or 0).
    const completedScan = scanStore.scans.find(s => s.status === 'completed');
    if (completedScan) return completedScan.id;
    
    if (scanStore.scans.length > 0) return scanStore.scans[0].id;
    return null;
});

const latestScanStats = computed(() => {
    // If we have a running scan but we want to show stats of the last completed one,
    // we need to make sure scanStore.currentScan IS that particular scan.
    // However, fetchScanDetails usually updates currentScan.
    // Logic: 
    // 1. If scanStore.currentScan matches latestScanId, use its vulnerabilities.
    // 2. The watcher/onMounted usually fetches details for scanStore.scans[0].id.
    // FIX: We should fetch details for `latestScanId` instead of scans[0] in onMounted/watcher.
    
    if (!scanStore.currentScan || scanStore.currentScan.id !== latestScanId.value) return null;
    
    const counts = { critical: 0, high: 0, moderate: 0, low: 0, total: 0 };
    scanStore.vulnerabilities.forEach((v: any) => {
        if (!v.whitelisted && v.severity in counts) {
             counts[v.severity as keyof typeof counts]++;
             counts.total++;
        }
    });
    return counts;
});

const healthScore = computed(() => {
    // Same logic: use the score of the *latestScanId* which prioritizes completed scans
    const scan = scanStore.scans.find(s => s.id === latestScanId.value);
    return scan?.score || 0;
});


const healthColor = computed(() => {
    const score = healthScore.value;
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-blue-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
});

// --- Advanced Analytics (Phase 1) ---

// 1. Technical Debt Estimation
const remediationTime = computed(() => {
    if (!latestScanStats.value) return 0; // in hours
    const { critical, high, moderate, low } = latestScanStats.value;
    // Estimation assumptions:
    // Critical: 8h (1 day)
    // High: 4h
    // Moderate: 1h
    // Low: 0.5h
    return (critical * 8) + (high * 4) + (moderate * 1) + (low * 0.5);
});

const formattedRemediationTime = computed(() => {
    const hours = remediationTime.value;
    if (hours === 0) return '0h';
    if (hours < 8) return `${hours}h`;
    const days = Math.floor(hours / 8);
    const remHours = hours % 8;
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
});

// 2. Top Offenders
const topOffenders = computed(() => {
    // We need details of vulnerabilities.
    // If we only have latestScanStats (counts), we can't do this comfortably without fetching full details.
    // However, onMounted fetches scanStore.fetchScanDetails for the latest scan.
    // So scanStore.vulnerabilities IS populated with current scan's vulns.
    
    if (scanStore.vulnerabilities.length === 0) return [];

    const packageMap = new Map<string, { name: string, score: number, critical: number, high: number }>();

    scanStore.vulnerabilities.forEach(v => {
        if (v.whitelisted) return;
        const entry = packageMap.get(v.packageName) || { name: v.packageName, score: 0, critical: 0, high: 0 };
        
        let weight = 0;
        if (v.severity === 'critical') { weight = 10; entry.critical++; }
        else if (v.severity === 'high') { weight = 5; entry.high++; }
        else if (v.severity === 'moderate') weight = 2;
        else weight = 1;

        entry.score += weight;
        packageMap.set(v.packageName, entry);
    });

    return Array.from(packageMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
});

// 3. Trend Data Removed per user request
// const trendData = ...

// 4. Benchmark
const benchmarkComparison = computed(() => {
    if (!project.value || projectStore.projects.length <= 1) return null;
    
    const totalScore = projectStore.projects.reduce((acc, p) => {
        // We might not have scores for all projects unless we fetched them deep.
        // Assuming project list might eventually have a 'lastScanScore' prop, but currently it doesn't.
        // We can only benchmark against what we know using scanStore if we fetched scans for all? No too heavy.
        // BACKUP: Just comparing against text assumption or if project objects had score.
        // Since we don't have scores on the project listing, skip precise calculation for now
        // and return a placeholder or skip.
        return acc; 
    }, 0);
    
    return null; // TODO: Implement when Project Entity has lastScore
});


// --- Configuration ---
const schedulePreset = ref('custom');

const applySchedulePreset = () => {
    switch (schedulePreset.value) {
        case 'daily':
            settingsForm.value.cronSchedule = '0 0 * * *';
            break;
        case 'weekly':
            settingsForm.value.cronSchedule = '0 0 * * 0';
            break;
        case 'custom':
            // do not override
            break;
    }
};

const handleUpdateSettings = async () => {
  if (!project.value) return;
  
  isSettingsLoading.value = true;
  try {
    await projectStore.updateProject(project.value.id, settingsForm.value);
    toast.success('Settings updated successfully');
  } catch (error) {
    toast.error('Failed to update settings');
  } finally {
    isSettingsLoading.value = false;
  }
};

const initSettingsForm = () => {
  if (project.value) {
    settingsForm.value = {
      cronSchedule: project.value.cronSchedule || '',
      emailEnabled: project.value.emailEnabled || false,
      qualityGate: project.value.qualityGate || { minScore: 0, failOnSeverity: '' },
    };
    // determine preset
    if (settingsForm.value.cronSchedule === '0 0 * * *') schedulePreset.value = 'daily';
    else if (settingsForm.value.cronSchedule === '0 0 * * 0') schedulePreset.value = 'weekly';
    else schedulePreset.value = 'custom';
  }
};

// --- Danger Zone ---
const deleteConfirmation = ref('');
const isDeleting = ref(false);

const handleDeleteProject = async () => {
    if (deleteConfirmation.value !== project.value?.name) return;
    
    if (!confirm('This action cannot be undone. Are you absolutely sure?')) return;

    isDeleting.value = true;
    try {
        await projectStore.deleteProject(projectId.value);
        toast.success('Project deleted');
        router.push('/projects');
    } catch (e) {
        toast.error('Failed to delete project');
        isDeleting.value = false;
    }
};

const handleDeleteRule = async (ruleId: number) => {
    if (confirm('Are you sure you want to stop ignoring this vulnerability?')) {
        try {
            await projectStore.deleteWhitelistRule(projectId.value, ruleId);
            toast.success('Rule removed');
        } catch (e) {
            toast.error('Failed to remove rule');
        }
    }
};

// --- Audit Logs ---
import axios from 'axios';

const auditLogs = ref<any[]>([]);

const fetchAuditLogs = async () => {
    console.log('fetchAuditLogs called for project:', projectId.value);
    if (!projectId.value) {
        console.error('No project ID found');
        return;
    }
    try {
        // Use ds_token matches auth.ts configuration
        const token = localStorage.getItem('ds_token'); 
        // Note: useStorage might wrap strings in quotes depending on version/config, 
        // but typically raw string is stored if default. 
        // Safer to access via Pinia store if possible, but let's fix the key first.
        // auth.ts uses: const token = useStorage('ds_token', '');
        
        // Remove extra quotes if vueuse stored it as JSON string
        const cleanToken = token ? token.replace(/^"|"$/g, '') : '';

        const response = await axios.get(`http://localhost:3000/projects/${projectId.value}/audit`, {
            headers: { Authorization: `Bearer ${cleanToken}` }
        });
        console.log('Audit Logs Response:', response.data);
        if (Array.isArray(response.data)) {
             auditLogs.value = response.data;
        } else {
             auditLogs.value = [];
        }
    } catch (e) {
        console.error('Failed to fetch audit logs', e);
        auditLogs.value = [];
    }
};

const switchTab = (tab: string) => {
    console.log('Switching tab to:', tab);
    activeTab.value = tab;
    if (tab === 'activity') {
        fetchAuditLogs();
    }
};

const formatAuditAction = (action: string) => {
    return action ? action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : '';
};

// --- Watcher for Reactivity ---
import { watch } from 'vue';

// When latestScanId changes (e.g. a scan completes), we MUST fetch its details (vulnerabilities)
// so that computed properties (stats, top offenders) can update.
// Refresh data when project ID changes (routing)
watch(projectId, async (newId) => {
    if (newId) {
        // Reset scan store to clear old data (Top Offenders, etc.)
        scanStore.reset();
        
        // Fetch everything for new project
        await Promise.all([
            projectStore.fetchProjects(), // Ensure list is up to date if needed, or just rely on store lookup
            // Actually fetchProject might be better if we want details not in list? 
            // But we use computed from list usually.
            // Let's just fetchScans.
            scanStore.fetchScans(newId),
            projectStore.fetchWhitelistRules(newId),
        ]);
        // Note: computed 'project' will update automatically if it depends on projectId and store.

        fetchAuditLogs();
        initSettingsForm();
    }
});

watch(latestScanId, async (newId) => {
    if (newId) {
        // Force refresh details for this scan
        // This ensures scanStore.currentScan is effectively set to the latest completed scan,
        // and scanStore.vulnerabilities are populated for it.
        await scanStore.fetchScanDetails(newId, true);
    }
});

onMounted(async () => {
  // Clear any existing scan data from previous views
  scanStore.reset();

  if (!project.value) {
    await projectStore.fetchProjects();
  }
  await scanStore.fetchScans(projectId.value);
  
  // Fetch details of the latest scan for stats
  // Use computed latestScanId to get the most relevant one (completed preferably)
  if (latestScanId.value) {
      await scanStore.fetchScanDetails(latestScanId.value, true);
  }

  await projectStore.fetchWhitelistRules(projectId.value);
  initSettingsForm();
  checkPolling();
  fetchAuditLogs();
});
</script>

<template>
  <DashboardLayout>
    <div class="p-8">
      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <button
            @click="router.push('/projects')"
            class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft class="w-4 h-4" />
            {{ $t('project_detail.back_to_projects') }}
          </button>
          <h2 class="text-3xl font-bold tracking-tight">{{ project?.name }}</h2>
          <p class="text-muted-foreground flex items-center gap-2 mt-1">
            <Package2 class="w-4 h-4" /> {{ project?.repositoryName }}
            <span class="text-xs bg-secondary px-2 py-0.5 rounded text-secondary-foreground">{{ project?.branch }}</span>
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="handleTriggerScan"
            :disabled="scanStore.loading"
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2 disabled:opacity-50 shadow-sm"
          >
            <Play v-if="!scanStore.loading" class="w-4 h-4" />
            <div v-else class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
            {{ scanStore.loading ? $t('project_detail.scanning') : $t('project_detail.run_scan') }}
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="border-b mb-8">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            @click="activeTab = 'overview'"
            :class="[
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground',
              'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm gap-2'
            ]"
          >
            <LayoutDashboard class="w-4 h-4" />
            Overview
          </button>
          <button
            @click="activeTab = 'scans'"
            :class="[
              activeTab === 'scans'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground',
              'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm gap-2'
            ]"
          >
            <List class="w-4 h-4" />
            Scan History
          </button>
          <button
            @click="activeTab = 'whitelist'"
            :class="[
              activeTab === 'whitelist'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground',
              'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm gap-2'
            ]"
          >
            <EyeOff class="w-4 h-4" />
            Ignored Vulnerabilities
            <span v-if="projectStore.whitelistRules.length" class="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs ml-1">{{ projectStore.whitelistRules.length }}</span>
          </button>
          <button
            @click="activeTab = 'settings'"
            :class="[
              activeTab === 'settings'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground',
              'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm gap-2'
            ]"
          >
            <Settings class="w-4 h-4" />
            Configuration
          </button>
          <button
            @click="switchTab('activity')"
            :class="[
              activeTab === 'activity'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground',
              'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm gap-2'
            ]"
          >
            <FileText class="w-4 h-4" />
            Activity
          </button>
        </nav>
      </div>

      <!-- Tab Content: Overview -->
      <div v-show="activeTab === 'overview'" class="space-y-6">
        <!-- Row 1: Key Metrics (4 cols) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Total Scans -->
          <Card>
            <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle class="text-sm font-medium text-muted-foreground">{{ $t('project_detail.total_scans') }}</CardTitle>
              <FileText class="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">{{ scanStore.pagination.total }}</div>
              <p class="text-xs text-muted-foreground">+{{ scanStore.scans.filter(s => new Date(s.startedAt).getTime() > Date.now() - 86400000 * 7).length }} this week</p>
            </CardContent>
          </Card>

          <!-- Health Score -->
          <Card>
            <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle class="text-sm font-medium text-muted-foreground">Security Health</CardTitle>
              <Shield class="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold" :class="healthColor">{{ healthScore.toFixed(0) }}/100</div>
              <p class="text-xs text-muted-foreground">Target: > 80</p>
            </CardContent>
          </Card>

          <!-- Tech Debt -->
          <Card>
              <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle class="text-sm font-medium text-muted-foreground">Est. Remediation</CardTitle>
                  <Clock class="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div class="text-2xl font-bold">{{ formattedRemediationTime }}</div>
                  <p class="text-xs text-muted-foreground">To resolve all issues</p>
              </CardContent>
          </Card>


          <!-- Repository -->
           <Card>
            <CardHeader class="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle class="text-sm font-medium text-muted-foreground">Repository</CardTitle>
              <Package2 class="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
               <div class="truncate font-medium" :title="project?.repositoryName">{{ project?.repositoryName || 'N/A' }}</div>
               <div class="flex items-center gap-2 mt-1">
                 <span class="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{{ project?.branch }}</span>
                 <span class="text-xs border px-1.5 py-0.5 rounded uppercase">{{ project?.packageManager }}</span>
               </div>
            </CardContent>
          </Card>
        </div>

        <!-- Row 2: Top Offenders (Full width now) -->
        <div class="grid grid-cols-1">
             <!-- Top Offenders -->
            <Card>
                <CardHeader>
                    <CardTitle>Top Offenders</CardTitle>
                </CardHeader>
                <CardContent>
                    <div v-if="topOffenders.length === 0" class="text-sm text-muted-foreground py-4">
                        No active vulnerabilities. Good job!
                    </div>
                    <ul v-else class="space-y-3">
                        <li v-for="pkg in topOffenders" :key="pkg.name" class="flex justify-between items-center text-sm">
                            <span class="font-mono truncate max-w-[300px]" :title="pkg.name">{{ pkg.name }}</span>
                            <div class="flex gap-1 shrink-0">
                                <span v-if="pkg.critical" class="bg-red-500 text-white px-1.5 rounded text-xs font-bold" title="Critical">{{ pkg.critical }}</span>
                                <span v-if="pkg.high" class="bg-orange-500 text-white px-1.5 rounded text-xs font-bold" title="High">{{ pkg.high }}</span>
                            </div>
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>

        <!-- Row 3: Detailed Distribution & Activity -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Latest Scan Distribution -->
            <Card class="h-full">
                <CardHeader>
                    <CardTitle>Vulnerability Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                     <div v-if="!latestScanStats || latestScanStats.total === 0" class="flex flex-col items-center justify-center h-40 text-muted-foreground">
                        <Shield class="w-12 h-12 mb-2 opacity-20" />
                        <p>No vulnerabilities found or no scan data.</p>
                     </div>
                     <div v-else class="space-y-4 pt-4">
                         <!-- Stacked Bar -->
                        <div class="h-8 w-full rounded-full overflow-hidden flex">
                            <div v-if="latestScanStats.critical > 0" class="h-full bg-red-500" :style="{ width: (latestScanStats.critical / latestScanStats.total * 100) + '%' }" :title="`${latestScanStats.critical} Critical`"></div>
                            <div v-if="latestScanStats.high > 0" class="h-full bg-orange-500" :style="{ width: (latestScanStats.high / latestScanStats.total * 100) + '%' }" :title="`${latestScanStats.high} High`"></div>
                            <div v-if="latestScanStats.moderate > 0" class="h-full bg-yellow-500" :style="{ width: (latestScanStats.moderate / latestScanStats.total * 100) + '%' }" :title="`${latestScanStats.moderate} Moderate`"></div>
                            <div v-if="latestScanStats.low > 0" class="h-full bg-blue-500" :style="{ width: (latestScanStats.low / latestScanStats.total * 100) + '%' }" :title="`${latestScanStats.low} Low`"></div>
                        </div>
                        <!-- Legend/Stats -->
                        <div class="grid grid-cols-2 gap-4">
                            <div class="flex items-center gap-2">
                                <div class="w-3 h-3 rounded-full bg-red-500"></div>
                                <span class="text-sm font-medium">{{ latestScanStats.critical }} Critical</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <div class="w-3 h-3 rounded-full bg-orange-500"></div>
                                <span class="text-sm font-medium">{{ latestScanStats.high }} High</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <span class="text-sm font-medium">{{ latestScanStats.moderate }} Moderate</span>
                            </div>
                             <div class="flex items-center gap-2">
                                <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span class="text-sm font-medium">{{ latestScanStats.low }} Low</span>
                            </div>
                        </div>
                     </div>
                </CardContent>
            </Card>

             <!-- Recent Activity -->
            <Card class="h-full">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div v-if="scanStore.scans.length === 0" class="text-center py-8 text-muted-foreground">
                        No scans yet.
                    </div>
                    <ul v-else class="space-y-4">
                        <li v-for="scan in scanStore.scans.slice(0, 5)" :key="scan.id" 
                            class="flex justify-between items-center border-b pb-2 last:border-0 hover:bg-muted/50 p-2 rounded cursor-pointer transition-colors"
                             @click="router.push(`/scans/${scan.id}`)"
                        >
                            <div>
                                <div class="font-medium text-sm flex items-center gap-2">
                                    Scan #{{ scan.id }}
                                    <ChevronRight class="w-3 h-3 text-muted-foreground" />
                                </div>
                                <div class="text-xs text-muted-foreground">{{ formatDate(scan.startedAt) }}</div>
                            </div>
                            <span :class="getStatusColor(scan.status)" class="px-2 py-0.5 rounded text-xs font-medium border uppercase">{{ scan.status }}</span>
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
      </div>

      <!-- Tab Content: Scans -->
      <div v-show="activeTab === 'scans'">
         <!-- ... existing scans content ... -->
         <Card>
          <CardHeader>
            <CardTitle>{{ $t('project_detail.scan_history') }}</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="relative min-h-[200px]">
              <div v-if="scanStore.loading" class="absolute inset-0 flex items-center justify-center bg-background/50 z-10 backdrop-blur-[1px]">
                  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>

              <div v-if="!scanStore.loading && scanStore.scans.length === 0" class="text-center py-12">
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
                    <tr v-for="scan in scanStore.scans" :key="scan.id" class="hover:bg-muted/50 transition-colors">
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
                          class="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          Details <ChevronRight class="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <!-- Pagination -->
            <div class="flex items-center justify-between mt-4">
                <p class="text-sm text-muted-foreground">
                    {{ $t('common.showing') }} {{ (scanStore.pagination.page - 1) * scanStore.pagination.limit + 1 }} 
                    {{ $t('common.to') }} {{ Math.min(scanStore.pagination.page * scanStore.pagination.limit, scanStore.pagination.total) }} 
                    {{ $t('common.of') }} {{ scanStore.pagination.total }}
                </p>
                <div class="flex items-center gap-2">
                    <button
                        @click="handlePageChange(scanStore.pagination.page - 1)"
                        :disabled="scanStore.pagination.page === 1"
                        class="px-3 py-1 border rounded text-sm disabled:opacity-50"
                    >Prev</button>
                    <button
                        @click="handlePageChange(scanStore.pagination.page + 1)"
                        :disabled="scanStore.pagination.page === scanStore.pagination.totalPages"
                        class="px-3 py-1 border rounded text-sm disabled:opacity-50"
                    >Next</button>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Tab Content: Whitelist (Ignored) -->
      <div v-show="activeTab === 'whitelist'">
          <!-- ... (whitelist content) -->
          <Card>
              <CardHeader>
                  <CardTitle>Ignored Vulnerabilities</CardTitle>
              </CardHeader>
              <CardContent>
                  <div v-if="projectStore.whitelistRules.length === 0" class="text-center py-12 text-muted-foreground">
                      No ignored vulnerabilities.
                  </div>
                  <div v-else class="overflow-x-auto">
                      <table class="w-full">
                          <thead>
                              <tr class="border-b">
                                  <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Package</th>
                                  <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">CVE</th>
                                  <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Reason</th>
                                  <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                                  <th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                              </tr>
                          </thead>
                          <tbody class="divide-y">
                              <tr v-for="rule in projectStore.whitelistRules" :key="rule.id" class="hover:bg-muted/50">
                                  <td class="px-4 py-3 font-medium">{{ rule.packageName }}</td>
                                  <td class="px-4 py-3 font-mono text-sm">{{ rule.cve || '-' }}</td>
                                  <td class="px-4 py-3 text-sm text-muted-foreground italic">{{ rule.reason || 'No reason provided' }}</td>
                                  <td class="px-4 py-3 text-sm">{{ formatDate(rule.createdAt) }}</td>
                                  <td class="px-4 py-3 text-right">
                                      <button @click="handleDeleteRule(rule.id)" class="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors" title="Remove from whitelist">
                                          <Trash2 class="w-4 h-4" />
                                      </button>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
              </CardContent>
          </Card>
      </div>

      <!-- Tab Content: Activity (Audit Trail) -->
      <div v-show="activeTab === 'activity'">
        <Card>
            <CardHeader>
                <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
                 <div v-if="auditLogs.length === 0" class="text-center py-12 text-muted-foreground">
                    <p>No activity recorded yet.</p>
                 </div>
                 <div v-else class="space-y-4">
                     <div v-for="log in auditLogs" :key="log.id" class="flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0">
                         <div class="w-2 h-2 mt-2 rounded-full bg-primary/50"></div>
                         <div class="flex-1 space-y-1">
                             <p class="text-sm font-medium">{{ formatAuditAction(log.action) }}</p>
                             <div class="text-xs text-muted-foreground flex gap-2">
                                <span>{{ formatDate(log.createdAt) }}</span>
                                <span>•</span>
                                <span>{{ log.user?.email || 'System' }}</span>
                             </div>
                             <pre v-if="log.details && Object.keys(log.details).length > 0" class="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">{{ log.details }}</pre>
                         </div>
                     </div>
                 </div>
            </CardContent>
        </Card>
      </div>

      <!-- Tab Content: Settings -->
      <div v-show="activeTab === 'settings'" class="space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- General Configuration -->
            <Card>
            <CardHeader>
                <CardTitle>{{ $t('project_detail.configuration') }}</CardTitle>
            </CardHeader>
            <CardContent>
                <form @submit.prevent="handleUpdateSettings" class="space-y-6">
                <div class="space-y-2">
                    <label class="text-sm font-medium">Schedule Preset</label>
                    <select 
                        v-model="schedulePreset" 
                        @change="applySchedulePreset"
                        class="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value="daily">Daily (Midnight)</option>
                        <option value="weekly">Weekly (Sundays)</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>

                <div class="space-y-2">
                    <label class="text-sm font-medium">{{ $t('project_detail.cron_schedule') }}</label>
                    <input
                    v-model="settingsForm.cronSchedule"
                    type="text"
                    placeholder="0 0 * * *"
                    :disabled="schedulePreset !== 'custom'"
                    class="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                    />
                    <p class="text-xs text-muted-foreground">Standard Cron syntax (min hour day month day-of-week)</p>
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

            <!-- Integration Tools -->
            <div class="space-y-6">
                <!-- Quality Gate -->
                <Card>
                    <CardHeader>
                        <CardTitle>Quality Gate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div class="space-y-4">
                            <p class="text-sm text-muted-foreground">Define criteria to mark a scan as failed.</p>
                            <div class="space-y-2">
                                <label class="text-xs font-medium uppercase text-muted-foreground">Min. Health Score</label>
                                <input 
                                    v-model.number="settingsForm.qualityGate.minScore"
                                    type="number"
                                    min="0" max="100"
                                    class="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="80"
                                />
                            </div>
                             <div class="space-y-2">
                                <label class="text-xs font-medium uppercase text-muted-foreground">Fail on Severity</label>
                                <select 
                                    v-model="settingsForm.qualityGate.failOnSeverity"
                                    class="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">None</option>
                                    <option value="critical">Critical</option>
                                    <option value="high">High & Critical</option>
                                    <option value="moderate">Moderate+</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- README Badge -->
                <Card>
                    <CardHeader>
                        <CardTitle>README Badge</CardTitle>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div class="flex items-center justify-center p-4 bg-muted/50 rounded-md border border-dashed">
                            <img :src="`http://localhost:3000/projects/${projectId}/badge`" alt="Security Rating" />
                        </div>
                        <div class="space-y-2">
                            <label class="text-xs font-medium uppercase text-muted-foreground">Markdown Snippet</label>
                            <div class="flex gap-2">
                                <input 
                                    readonly 
                                    :value="`[![Security Rating](http://localhost:3000/projects/${projectId}/badge)](http://localhost:5173/projects/${projectId})`"
                                    class="flex-1 px-3 py-2 text-xs font-mono bg-muted border rounded-md focus:outline-none"
                                />
                                <button class="px-3 py-2 border rounded-md hover:bg-muted text-xs font-medium" @click="toast.success('Copied to clipboard!')">Copy</button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- CI/CD Assistant -->
                <Card>
                    <CardHeader>
                        <CardTitle>CI/CD Integration</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div class="space-y-4">
                            <p class="text-sm text-muted-foreground">Trigger scans conveniently from your pipeline.</p>
                            <div class="space-y-2">
                                <label class="text-xs font-medium uppercase text-muted-foreground">CURL Command</label>
                                <div class="bg-slate-900 text-slate-50 p-3 rounded-md font-mono text-xs overflow-x-auto">
                                    curl -X POST http://localhost:3000/scans/trigger \<br/>
                                    &nbsp;&nbsp;-H "Authorization: Bearer YOUR_API_TOKEN" \<br/>
                                    &nbsp;&nbsp;-H "Content-Type: application/json" \<br/>
                                    &nbsp;&nbsp;-d '{"projectId": {{ projectId }}}'
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>

        <!-- Danger Zone -->
        <Card class="border-red-200 bg-red-50/10">
            <CardHeader>
                <CardTitle class="text-red-600">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
                 <div class="space-y-4 max-w-md">
                     <div class="text-sm text-muted-foreground">
                         To delete this project, type <strong>{{ project?.name }}</strong> below. This action is irreversible.
                     </div>
                     <input 
                         v-model="deleteConfirmation"
                         type="text" 
                         class="w-full px-3 py-2 bg-background border border-red-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/50"
                         :placeholder="project?.name"
                     />
                     <button
                        @click="handleDeleteProject"
                        :disabled="deleteConfirmation !== project?.name || isDeleting"
                        class="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-red-600 text-white hover:bg-red-700 h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        <Trash2 class="w-4 h-4 mr-2" />
                        {{ isDeleting ? 'Deleting...' : 'Delete Project' }}
                     </button>
                 </div>
            </CardContent>
        </Card>
      </div>
    </div>
  </DashboardLayout>
</template>
