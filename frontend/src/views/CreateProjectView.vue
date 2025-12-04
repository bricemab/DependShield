<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project';
import { FolderGit2, ArrowLeft, Check } from 'lucide-vue-next';
import Card from '../components/ui/Card.vue';
import CardHeader from '../components/ui/CardHeader.vue';
import CardTitle from '../components/ui/CardTitle.vue';
import CardContent from '../components/ui/CardContent.vue';
import ThemeToggle from '../components/ThemeToggle.vue';

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
  
  const [owner, repoName] = repo.fullName.split('/');
  await projectStore.fetchBranches(owner, repoName);
  step.value = 2;
};

const selectBranch = async (branchName: string) => {
  formData.value.branch = branchName;
  
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
  } else {
    router.push('/projects');
  }
};
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
        <div class="flex justify-between items-center mb-8">
          <div>
            <h2 class="text-3xl font-bold tracking-tight">Create New Project</h2>
            <p class="text-muted-foreground mt-1">Step {{ step }} of 3</p>
          </div>
          <ThemeToggle />
        </div>

        <!-- Progress -->
        <div class="flex items-center gap-4 mb-8">
          <div class="flex items-center gap-2">
            <div :class="step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'" class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">
              <Check v-if="step > 1" class="w-4 h-4" />
              <span v-else>1</span>
            </div>
            <span class="text-sm font-medium">Repository</span>
          </div>
          <div class="flex-1 h-px bg-border"></div>
          <div class="flex items-center gap-2">
            <div :class="step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'" class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">
              <Check v-if="step > 2" class="w-4 h-4" />
              <span v-else>2</span>
            </div>
            <span class="text-sm font-medium">Branch</span>
          </div>
          <div class="flex-1 h-px bg-border"></div>
          <div class="flex items-center gap-2">
            <div :class="step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'" class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">3</div>
            <span class="text-sm font-medium">Configure</span>
          </div>
        </div>

        <!-- Step 1: Select Repository -->
        <Card v-if="step === 1">
          <CardHeader>
            <CardTitle>Select Repository</CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="projectStore.loading" class="flex items-center justify-center py-12">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="repo in projectStore.repositories"
                :key="repo.id"
                @click="selectRepository(repo)"
                class="p-4 border rounded-lg cursor-pointer hover:border-primary hover:bg-accent transition-colors"
              >
                <div class="flex justify-between items-center">
                  <div>
                    <h3 class="font-medium">{{ repo.fullName }}</h3>
                    <p class="text-sm text-muted-foreground">{{ repo.private ? 'Private' : 'Public' }}</p>
                  </div>
                  <svg class="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>

            <button
              @click="goBack"
              class="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft class="w-4 h-4" />
              Back to Projects
            </button>
          </CardContent>
        </Card>

        <!-- Step 2: Select Branch -->
        <Card v-if="step === 2">
          <CardHeader>
            <CardTitle>Select Branch</CardTitle>
            <p class="text-sm text-muted-foreground mt-1">Repository: {{ formData.repositoryName }}</p>
          </CardHeader>
          <CardContent>
            <div v-if="projectStore.loading" class="flex items-center justify-center py-12">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="branch in projectStore.branches"
                :key="branch.name"
                @click="selectBranch(branch.name)"
                class="p-4 border rounded-lg cursor-pointer hover:border-primary hover:bg-accent transition-colors"
              >
                <div class="flex justify-between items-center">
                  <div>
                    <h3 class="font-medium">{{ branch.name }}</h3>
                    <p v-if="branch.protected" class="text-sm text-yellow-600">Protected</p>
                  </div>
                  <svg class="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>

            <button
              @click="goBack"
              class="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft class="w-4 h-4" />
              Back
            </button>
          </CardContent>
        </Card>

        <!-- Step 3: Configure -->
        <Card v-if="step === 3">
          <CardHeader>
            <CardTitle>Configure Project</CardTitle>
          </CardHeader>
          <CardContent>
            <form @submit.prevent="handleSubmit" class="space-y-6">
              <div class="space-y-2">
                <label class="text-sm font-medium">Project Name</label>
                <input
                  v-model="formData.name"
                  type="text"
                  required
                  class="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium">Package Manager</label>
                <select
                  v-model="formData.packageManager"
                  class="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="npm">npm</option>
                  <option value="yarn">yarn</option>
                  <option value="pnpm">pnpm</option>
                  <option value="bun">bun</option>
                </select>
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium">Cron Schedule</label>
                <input
                  v-model="formData.cronSchedule"
                  type="text"
                  placeholder="0 0 * * *"
                  class="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p class="text-xs text-muted-foreground">Daily at midnight: 0 0 * * *</p>
              </div>

              <div class="flex items-center gap-2">
                <input
                  v-model="formData.emailEnabled"
                  type="checkbox"
                  id="emailEnabled"
                  class="w-4 h-4 rounded border-gray-300"
                />
                <label for="emailEnabled" class="text-sm">
                  Enable email notifications
                </label>
              </div>

              <div class="flex gap-4 pt-4">
                <button
                  type="button"
                  @click="goBack"
                  class="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2"
                >
                  Back
                </button>
                <button
                  type="submit"
                  class="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  Create Project
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  </div>
</template>
