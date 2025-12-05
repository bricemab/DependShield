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
import LanguageSwitcher from '../components/LanguageSwitcher.vue';

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
  lockfilePath: './',
});

const selectedRepo = ref<any>(null);
const detectedLockfiles = ref<{ path: string; packageManager: string }[]>([]);

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
  
  const parts = formData.value.repositoryName.split('/');
  if (parts.length < 2) return;
  const owner = parts[0];
  const repoName = parts[1];
  const lockfiles = await projectStore.detectLockfiles(owner, repoName, branchName);
  
  detectedLockfiles.value = lockfiles;
  step.value = 3;
};

const selectLockfile = (lockfile: { path: string; packageManager: string }) => {
  formData.value.lockfilePath = lockfile.path;
  formData.value.packageManager = lockfile.packageManager;
  step.value = 4;
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
            {{ $t('projects.title') }}
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
            <h2 class="text-3xl font-bold tracking-tight">{{ $t('create_project.title') }}</h2>
            <p class="text-muted-foreground mt-1">Step {{ step }} of 3</p>
          </div>
          <div class="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <!-- Progress -->
        <div class="flex items-center gap-4 mb-8">
          <div class="flex items-center gap-2">
            <div :class="step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'" class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">
              <Check v-if="step > 1" class="w-4 h-4" />
              <span v-else>1</span>
            </div>
            <span class="text-sm font-medium">{{ $t('projects.columns.repository') }}</span>
          </div>
          <div class="flex-1 h-px bg-border"></div>
          <div class="flex items-center gap-2">
            <div :class="step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'" class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">
              <Check v-if="step > 2" class="w-4 h-4" />
              <span v-else>2</span>
            </div>
            <span class="text-sm font-medium">{{ $t('projects.columns.branch') }}</span>
          </div>
          <div class="flex-1 h-px bg-border"></div>
          <div class="flex items-center gap-2">
            <div :class="step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'" class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">3</div>
            <span class="text-sm font-medium">{{ $t('project_detail.configuration') }}</span>
          </div>
        </div>

        <!-- Step 1: Select Repository -->
        <Card v-if="step === 1">
          <CardHeader>
            <CardTitle>{{ $t('create_project.step_1_title') }}</CardTitle>
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
              {{ $t('project_detail.back_to_projects') }}
            </button>
          </CardContent>
        </Card>

        <!-- Step 2: Select Branch -->
        <Card v-if="step === 2">
          <CardHeader>
            <CardTitle>{{ $t('create_project.step_2_title') }}</CardTitle>
            <p class="text-sm text-muted-foreground mt-1">{{ $t('projects.columns.repository') }}: {{ formData.repositoryName }}</p>
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
              {{ $t('common.back') }}
            </button>
          </CardContent>
        </Card>

        <!-- Step 3: Select Lockfile (New Step) -->
        <Card v-if="step === 3">
          <CardHeader>
            <CardTitle>{{ $t('create_project.step_3_title') }}</CardTitle>
            <p class="text-sm text-muted-foreground mt-1">{{ $t('create_project.step_3_desc') }}</p>
          </CardHeader>
          <CardContent>
            <div v-if="detectedLockfiles.length === 0" class="text-center py-8">
              <p class="text-muted-foreground mb-4">{{ $t('create_project.no_lockfiles') }}</p>
              <button
                @click="step = 4"
                class="text-primary hover:underline"
              >
                {{ $t('create_project.configure_manually') }}
              </button>
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="lockfile in detectedLockfiles"
                :key="lockfile.path"
                @click="selectLockfile(lockfile)"
                class="p-4 border rounded-lg cursor-pointer hover:border-primary hover:bg-accent transition-colors"
              >
                <div class="flex justify-between items-center">
                  <div>
                    <h3 class="font-medium">{{ lockfile.path }}</h3>
                    <p class="text-sm text-muted-foreground">{{ $t('create_project.detected') }}: {{ lockfile.packageManager }}</p>
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
              {{ $t('common.back') }}
            </button>
          </CardContent>
        </Card>

        <!-- Step 4: Configure -->
        <Card v-if="step === 4">
          <CardHeader>
            <CardTitle>{{ $t('create_project.step_4_title') }}</CardTitle>
          </CardHeader>
          <CardContent>
            <form @submit.prevent="handleSubmit" class="space-y-6">
              <div class="space-y-2">
                <label class="text-sm font-medium">{{ $t('create_project.project_name') }}</label>
                <input
                  v-model="formData.name"
                  type="text"
                  required
                  class="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium">{{ $t('create_project.lockfile_path') }}</label>
                <input
                  v-model="formData.lockfilePath"
                  type="text"
                  class="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p class="text-xs text-muted-foreground">{{ $t('create_project.lockfile_path_desc') }}</p>
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium">{{ $t('create_project.package_manager') }}</label>
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
                <label class="text-sm font-medium">{{ $t('project_detail.cron_schedule') }}</label>
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
                  {{ $t('project_detail.enable_email') }}
                </label>
              </div>

              <div class="flex gap-4 pt-4">
                <button
                  type="button"
                  @click="goBack"
                  class="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2"
                >
                  {{ $t('common.back') }}
                </button>
                <button
                  type="submit"
                  class="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  {{ $t('projects.create_new') }}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  </div>
</template>
