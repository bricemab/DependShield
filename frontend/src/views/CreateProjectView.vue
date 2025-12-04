<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project';

const router = useRouter();
const projectStore = useProjectStore();

const step = ref(1);
const formData = ref({
  name: '',
  repositoryUrl: '',
  repositoryName: '',
  branch: '',
  packageManager: 'npm',
  cronSchedule: '0 0 * * *',
  emailEnabled: false,
});

const selectedRepo = ref<any>(null);

onMounted(() => {
  projectStore.fetchRepositories();
});

const selectRepository = async (repo: any) => {
  selectedRepo.value = repo;
  formData.value.repositoryUrl = repo.url;
  formData.value.repositoryName = repo.fullName;
  formData.value.name = repo.name;
  
  // Fetch branches
  const [owner, repoName] = repo.fullName.split('/');
  await projectStore.fetchBranches(owner, repoName);
  step.value = 2;
};

const selectBranch = async (branchName: string) => {
  formData.value.branch = branchName;
  
  // Detect lockfile
  const [owner, repoName] = formData.value.repositoryName.split('/');
  const detectedPM = await projectStore.detectLockfile(owner, repoName, branchName);
  if (detectedPM) {
    formData.value.packageManager = detectedPM;
  }
  
  step.value = 3;
};

const handleSubmit = async () => {
  try {
    await projectStore.createProject(formData.value);
    router.push('/projects');
  } catch (error) {
    alert('Failed to create project');
  }
};

const goBack = () => {
  if (step.value > 1) {
    step.value--;
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
    <div class="max-w-4xl mx-auto">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Create New Project</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">Step {{ step }} of 3</p>
      </div>

      <!-- Step 1: Select Repository -->
      <div v-if="step === 1" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Select Repository</h2>
        
        <div v-if="projectStore.loading" class="text-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="repo in projectStore.repositories"
            :key="repo.id"
            @click="selectRepository(repo)"
            class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div class="flex justify-between items-center">
              <div>
                <h3 class="font-medium text-gray-900 dark:text-white">{{ repo.fullName }}</h3>
                <p class="text-sm text-gray-500">{{ repo.private ? 'Private' : 'Public' }}</p>
              </div>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Select Branch -->
      <div v-if="step === 2" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Select Branch</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Repository: {{ formData.repositoryName }}</p>

        <div v-if="projectStore.loading" class="text-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="branch in projectStore.branches"
            :key="branch.name"
            @click="selectBranch(branch.name)"
            class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div class="flex justify-between items-center">
              <div>
                <h3 class="font-medium text-gray-900 dark:text-white">{{ branch.name }}</h3>
                <p v-if="branch.protected" class="text-sm text-yellow-600">Protected</p>
              </div>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        <button @click="goBack" class="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
          Back
        </button>
      </div>

      <!-- Step 3: Configure -->
      <div v-if="step === 3" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Configure Project</h2>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project Name</label>
            <input
              v-model="formData.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Package Manager</label>
            <select
              v-model="formData.packageManager"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="npm">npm</option>
              <option value="yarn">yarn</option>
              <option value="pnpm">pnpm</option>
              <option value="bun">bun</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cron Schedule</label>
            <input
              v-model="formData.cronSchedule"
              type="text"
              placeholder="0 0 * * *"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p class="text-xs text-gray-500 mt-1">Daily at midnight: 0 0 * * *</p>
          </div>

          <div class="flex items-center">
            <input
              v-model="formData.emailEnabled"
              type="checkbox"
              id="emailEnabled"
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label for="emailEnabled" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Enable email notifications
            </label>
          </div>

          <div class="flex gap-4 mt-6">
            <button
              type="button"
              @click="goBack"
              class="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
