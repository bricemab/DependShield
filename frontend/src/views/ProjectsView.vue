<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project';
import { FolderGit2, Plus, Trash2, GitBranch, Package, Mail } from 'lucide-vue-next';
import Card from '../components/ui/Card.vue';
import CardHeader from '../components/ui/CardHeader.vue';
import CardTitle from '../components/ui/CardTitle.vue';
import CardContent from '../components/ui/CardContent.vue';
import ThemeToggle from '../components/ThemeToggle.vue';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';

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

const handleDeleteProject = async (id: number, event: Event) => {
  event.stopPropagation();
  if (confirm('Are you sure you want to delete this project?')) {
    await projectStore.deleteProject(id);
  }
};
</script>

<template>
  <div class="flex h-screen bg-background">
    <!-- Sidebar -->
    <aside class="w-64 border-r bg-card flex flex-col">
      <!-- Logo -->
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

      <!-- Navigation -->
      <nav class="flex-1 p-4">
        <div class="space-y-1">
          <router-link
            to="/projects"
            class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            active-class="bg-accent text-accent-foreground"
          >
            <FolderGit2 class="w-4 h-4" />
            {{ $t('projects.title') }}
          </router-link>
        </div>
      </nav>

      <!-- User Section -->
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
        <div class="flex justify-between items-center mb-8">
          <div>
            <h2 class="text-3xl font-bold tracking-tight">{{ $t('projects.title') }}</h2>
            <p class="text-muted-foreground mt-1">{{ $t('projects.subtitle') }}</p>
          </div>
          <div class="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              @click="handleCreateProject"
              class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2"
            >
              <Plus class="w-4 h-4" />
              {{ $t('projects.create_new') }}
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="projectStore.loading" class="flex items-center justify-center py-20">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>

        <!-- Empty State -->
        <div v-else-if="projectStore.projects.length === 0" class="flex flex-col items-center justify-center py-20">
          <div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FolderGit2 class="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 class="text-xl font-semibold mb-2">{{ $t('projects.no_projects') }}</h3>
          <p class="text-muted-foreground mb-6">{{ $t('projects.create_first') }}</p>
          <button
            @click="handleCreateProject"
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2"
          >
            <Plus class="w-4 h-4" />
            {{ $t('projects.create_new') }}
          </button>
        </div>

        <!-- Projects Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            v-for="project in projectStore.projects"
            :key="project.id"
            @click="handleViewProject(project.id)"
            class="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
          >
            <CardHeader>
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <CardTitle class="text-lg mb-1">{{ project.name }}</CardTitle>
                  <p class="text-sm text-muted-foreground font-mono">{{ project.repositoryName }}</p>
                </div>
                <button
                  @click="(e) => handleDeleteProject(project.id, e)"
                  class="p-2 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div class="space-y-3">
                <div class="flex items-center gap-2 text-sm">
                  <GitBranch class="w-4 h-4 text-muted-foreground" />
                  <span class="text-muted-foreground">{{ $t('projects.columns.branch') }}:</span>
                  <span class="font-medium">{{ project.branch }}</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                  <Package class="w-4 h-4 text-muted-foreground" />
                  <span class="text-muted-foreground">{{ $t('project_detail.package_manager') }}:</span>
                  <span class="font-medium uppercase">{{ project.packageManager }}</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                  <Mail class="w-4 h-4 text-muted-foreground" />
                  <span class="text-muted-foreground">{{ $t('common.email') }}:</span>
                  <span :class="project.emailEnabled ? 'text-green-500' : 'text-muted-foreground'">
                    {{ project.emailEnabled ? $t('common.yes') : $t('common.no') }}
                  </span>
                </div>
              </div>
              <div class="mt-4 pt-4 border-t">
                <span class="text-sm text-primary font-medium inline-flex items-center gap-1">
                  {{ $t('common.actions') }}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  </div>
</template>
