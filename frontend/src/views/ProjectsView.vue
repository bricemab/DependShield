<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const projectStore = useProjectStore();
const authStore = useAuthStore();

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
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
    <div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-4xl font-bold text-white mb-2">Projects</h1>
          <p class="text-gray-400">Manage your vulnerability scanners</p>
        </div>
        <div class="flex gap-4">
          <button
            @click="handleCreateProject"
            class="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </button>
          <button
            @click="authStore.logout(); router.push('/login')"
            class="px-4 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div v-if="projectStore.loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>

      <div v-else-if="projectStore.projects.length === 0" class="text-center py-12">
        <div class="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-12 border border-gray-700/50">
          <svg class="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p class="text-gray-400 mb-6 text-lg">No projects yet. Create your first one!</p>
          <button
            @click="handleCreateProject"
            class="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg text-lg"
          >
            Create Project
          </button>
        </div>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="project in projectStore.projects"
          :key="project.id"
          @click="handleViewProject(project.id)"
          class="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-blue-500/50 transition-all cursor-pointer group hover:shadow-xl hover:shadow-blue-500/10"
        >
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h3 class="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">{{ project.name }}</h3>
              <p class="text-sm text-gray-400 mb-1 font-mono">{{ project.repositoryName }}</p>
            </div>
            <button
              @click="(e) => handleDeleteProject(project.id, e)"
              class="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <div class="space-y-3">
            <div class="flex items-center gap-2 text-sm">
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
              <span class="text-gray-400">Branch:</span>
              <span class="font-medium text-white">{{ project.branch }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span class="text-gray-400">Package Manager:</span>
              <span class="font-medium text-white uppercase">{{ project.packageManager }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span class="text-gray-400">Email:</span>
              <span :class="project.emailEnabled ? 'text-green-400' : 'text-gray-500'">
                {{ project.emailEnabled ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-gray-700/50">
            <span class="text-blue-400 group-hover:text-blue-300 text-sm font-medium flex items-center gap-1">
              View Details
              <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
