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

const handleDeleteProject = async (id: number) => {
  if (confirm('Are you sure you want to delete this project?')) {
    await projectStore.deleteProject(id);
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
    <div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-2">Manage your vulnerability scanners</p>
        </div>
        <div class="flex gap-4">
          <button
            @click="handleCreateProject"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Project
          </button>
          <button
            @click="authStore.logout(); router.push('/login')"
            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div v-if="projectStore.loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>

      <div v-else-if="projectStore.projects.length === 0" class="text-center py-12">
        <p class="text-gray-600 dark:text-gray-400 mb-4">No projects yet. Create your first one!</p>
        <button
          @click="handleCreateProject"
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Project
        </button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="project in projectStore.projects"
          :key="project.id"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">{{ project.name }}</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">{{ project.repositoryName }}</p>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500">Branch:</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ project.branch }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Package Manager:</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ project.packageManager }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Email:</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ project.emailEnabled ? 'Enabled' : 'Disabled' }}</span>
            </div>
          </div>
          <div class="mt-4 flex gap-2">
            <button
              @click="handleDeleteProject(project.id)"
              class="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
