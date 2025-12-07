<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project';
import { 
    FolderGit2, 
    Plus, 
    GitBranch, 
    Github, 
    ShieldCheck, 
    AlertTriangle,
    Activity,
    Trash2
} from 'lucide-vue-next';
import DashboardLayout from '../layouts/DashboardLayout.vue';
import Dialog from '../components/ui/Dialog.vue';
import { toast } from 'vue-sonner';

const router = useRouter();
const projectStore = useProjectStore();

onMounted(() => {
  projectStore.fetchProjects();
});

const handleCreateProject = () => {
  router.push('/projects/create');
};

const handleViewProject = (id: number) => {
  router.push(`/projects/${id}`);
};

// Delete Logic
const showDeleteModal = ref(false);
const projectToDelete = ref<any>(null);
const confirmName = ref('');
const isDeleting = ref(false);

const openDeleteModal = (project: any, event: Event) => {
  event.stopPropagation();
  projectToDelete.value = project;
  confirmName.value = '';
  showDeleteModal.value = true;
};

const handleDeleteConfirm = async () => {
  if (!projectToDelete.value) return;
  if (confirmName.value !== projectToDelete.value.name) return;
  
  isDeleting.value = true;
  try {
    await projectStore.deleteProject(projectToDelete.value.id);
    toast.success('Project deleted');
    showDeleteModal.value = false;
    projectToDelete.value = null;
  } catch (error) {
    toast.error('Failed to delete project');
  } finally {
    isDeleting.value = false;
  }
};

const formatTimeAgo = (dateRequest: string | Date) => {
    if (!dateRequest) return 'Never';
    const date = new Date(dateRequest);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

const getHealthColor = (score: number) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
};
</script>

<template>
  <DashboardLayout>
    <div class="p-8 min-h-screen bg-background relative overflow-hidden">
        <!-- Background Elements -->
        <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div class="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none"></div>

      <!-- Header -->
      <div class="flex justify-between items-end mb-12 relative z-10">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">{{ $t('projects.title') }}</h2>
          <p class="text-muted-foreground mt-1">{{ $t('projects.subtitle') }}</p>
        </div>
        
        <button
            @click="handleCreateProject"
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2"
          >
          <Plus class="w-4 h-4" />
          {{ $t('projects.create_new') }}
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="projectStore.loading" class="flex items-center justify-center py-32">
        <div class="relative">
            <div class="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
            <div class="absolute inset-0 flex items-center justify-center">
                <ShieldCheck class="w-6 h-6 text-primary/50" />
            </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="projectStore.projects.length === 0" class="flex flex-col items-center justify-center py-32 text-center relative z-10">
        <div class="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6 backdrop-blur-sm border border-border/50">
          <FolderGit2 class="w-10 h-10 text-muted-foreground/50" />
        </div>
        <h3 class="text-2xl font-bold mb-3">{{ $t('projects.no_projects') }}</h3>
        <p class="text-muted-foreground mb-8 max-w-sm mx-auto">{{ $t('projects.create_first') }}</p>
        <button
          @click="handleCreateProject"
          class="inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-8"
        >
          Get Started
        </button>
      </div>

      <!-- Projects Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">
        <div
          v-for="project in projectStore.projects"
          :key="project.id"
          @click="handleViewProject(project.id)"
          class="group relative bg-card/40 hover:bg-card/60 backdrop-blur-md border border-border/50 hover:border-primary/50 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 overflow-hidden"
        >
          <!-- Gradient Overlay on Hover -->
           <div class="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

          <!-- Card Header -->
          <div class="flex items-start justify-between mb-6 relative">
             <div class="flex items-center gap-4">
                 <div class="w-12 h-12 rounded-lg bg-background/50 border border-border flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                     <Github v-if="project.repositoryUrl.includes('github')" class="w-6 h-6 text-foreground" />
                     <FolderGit2 v-else class="w-6 h-6 text-foreground" />
                 </div>
                 <div class="min-w-0">
                     <h3 class="font-bold text-lg leading-tight group-hover:text-primary transition-colors pr-2 truncate">{{ project.name }}</h3>
                     <div class="flex items-center gap-2 mt-1">
                         <GitBranch class="w-3 h-3 text-muted-foreground" />
                         <span class="text-xs text-muted-foreground font-mono truncate max-w-[150px]">{{ project.branch }}</span>
                     </div>
                 </div>
             </div>
             
             <!-- Delete Button (Restored) -->
             <button
                @click="(e) => openDeleteModal(project, e)"
                class="opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-destructive/10 hover:text-destructive transition-all text-muted-foreground focus:opacity-100"
                title="Delete Project"
             >
                <Trash2 class="w-4 h-4" />
             </button>
          </div>

          <!-- Stats/Health Row -->
          <div class="grid grid-cols-2 gap-4 mb-6 relative">
              <div class="bg-background/30 rounded-lg p-3 border border-border/30">
                  <div class="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <Activity class="w-3 h-3" /> Health Score
                  </div>
                  <div class="text-2xl font-bold" :class="getHealthColor(project.lastScan?.score || 0)">
                      {{ project.lastScan?.score ? Math.round(project.lastScan.score) : '--' }}
                      <span class="text-xs text-muted-foreground font-normal">%</span>
                  </div>
              </div>
               <div class="bg-background/30 rounded-lg p-3 border border-border/30">
                  <div class="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <AlertTriangle class="w-3 h-3" /> Vulnerabilities
                  </div>
                  <div class="flex items-baseline gap-1">
                       <span class="text-2xl font-bold text-foreground">
                           {{ project.lastScan?.vulnerabilities?.length || 0 }}
                       </span>
                       <span v-if="project.lastScan?.vulnerabilitiesCount && project.lastScan.vulnerabilitiesCount > 0" class="text-xs text-red-500 font-medium">
                           ({{ project.lastScan.vulnerabilities?.filter((v:any) => v.severity === 'critical').length }} crit)
                       </span>
                   </div>
              </div>
          </div>

          <!-- Footer/Status -->
          <div class="flex items-center justify-between pt-4 border-t border-border/50 relative">
              <div class="flex items-center gap-2">
                  <div class="relative flex h-2 w-2">
                    <span v-if="project.lastScan?.status === 'running'" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2" :class="{
                        'bg-green-500': project.lastScan?.status === 'completed',
                        'bg-blue-500': project.lastScan?.status === 'running',
                        'bg-red-500': project.lastScan?.status === 'failed',
                        'bg-yellow-500': project.lastScan?.status === 'pending',
                        'bg-gray-500': !project.lastScan
                    }"></span>
                  </div>
                   <span class="text-xs text-muted-foreground" v-if="project.lastScan">
                       {{ project.lastScan.status === 'running' ? 'Scanning...' : formatTimeAgo(project.lastScan.startedAt) }}
                   </span>
                   <span class="text-xs text-muted-foreground" v-else>No scans yet</span>
              </div>

               <div class="flex items-center gap-2 text-xs font-medium text-primary uppercase tracking-wider">
                   View Details
                   <svg class="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
               </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <Dialog
      :show="showDeleteModal"
      title="Delete Project"
      description="This action cannot be undone. This will permanently delete the project and all associated scan data."
      @close="showDeleteModal = false"
    >
        <div class="py-4 space-y-4">
            <div class="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/50 rounded-md text-sm text-red-600 dark:text-red-400">
                <p class="font-medium flex items-center gap-2">
                    <AlertTriangle class="w-4 h-4" />
                    Warning: Irreversible Action
                </p>
                <p class="mt-1 opacity-90">All vulnerability reports, history, and configuration will be wiped immediately.</p>
            </div>

            <div class="space-y-2">
                <label class="text-sm font-medium">
                    Type <span class="font-mono font-bold">{{ projectToDelete?.name }}</span> to confirm:
                </label>
                <input 
                    type="text" 
                    v-model="confirmName"
                    class="w-full h-10 px-3 rounded-md border bg-background border-input focus:ring-2 focus:ring-destructive/50 focus:border-destructive font-mono text-sm"
                    placeholder="Project Name"
                    @keyup.enter="handleDeleteConfirm"
                />
            </div>
        </div>

        <template #footer>
            <button
                @click="showDeleteModal = false"
                class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-10 px-4 py-2 hover:bg-secondary text-secondary-foreground"
            >
                Cancel
            </button>
            <button
                @click="handleDeleteConfirm"
                :disabled="confirmName !== projectToDelete?.name || isDeleting"
                class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-10 px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed gap-2"
            >
                <Trash2 v-if="!isDeleting" class="w-4 h-4" />
                <div v-else class="animate-spin rounded-full h-4 w-4 border-2 border-white/50 border-t-white"></div>
                {{ isDeleting ? 'Deleting...' : 'Delete Project' }}
            </button>
        </template>
    </Dialog>
  </DashboardLayout>
</template>
