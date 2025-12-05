import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project';
import { ArrowLeft, Check, Search, Lock, Globe, GitBranch } from 'lucide-vue-next';
import Card from '../components/ui/Card.vue';
import CardHeader from '../components/ui/CardHeader.vue';
import CardTitle from '../components/ui/CardTitle.vue';
import CardContent from '../components/ui/CardContent.vue';
import ThemeToggle from '../components/ThemeToggle.vue';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';
import DashboardLayout from '../layouts/DashboardLayout.vue';

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

const repoSearchQuery = ref('');
const branchSearchQuery = ref('');

const filteredRepositories = computed(() => {
  let repos = [...projectStore.repositories]; // Create a copy to avoid mutating store state if sort does in-place
  if (repoSearchQuery.value) {
    const query = repoSearchQuery.value.toLowerCase();
    repos = repos.filter(r => r.fullName.toLowerCase().includes(query));
  }
  return repos.sort((a, b) => a.fullName.localeCompare(b.fullName));
});

const filteredBranches = computed(() => {
  let branches = [...projectStore.branches];
  if (branchSearchQuery.value) {
    const query = branchSearchQuery.value.toLowerCase();
    branches = branches.filter(b => b.name.toLowerCase().includes(query));
  }
  return branches.sort((a, b) => a.name.localeCompare(b.name));
  return branches.sort((a, b) => a.name.localeCompare(b.name));
});

import cronstrue from 'cronstrue/i18n';
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();

const cronDescription = computed(() => {
  try {
    return cronstrue.toString(formData.value.cronSchedule, { locale: locale.value });
  } catch (e) {
    return '';
  }
});

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
  if (!owner || !repoName) return;
  const lockfiles = await projectStore.detectLockfiles(owner, repoName, branchName);
  
  detectedLockfiles.value = lockfiles;
  step.value = 3;
};

const selectLockfile = (lockfile: { path: string; packageManager: string }) => {
  formData.value.lockfilePath = lockfile.path;
  formData.value.packageManager = lockfile.packageManager || 'npm';
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

const goToStep = (targetStep: number) => {
  if (targetStep < step.value) {
    step.value = targetStep;
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
  <DashboardLayout>
    <div class="p-8">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">{{ $t('create_project.title') }}</h2>
          <p class="text-muted-foreground mt-1">Step {{ step }} of 4</p>
        </div>
        <div class="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>

        <!-- Progress -->
        <div class="flex items-center gap-4 mb-8">
          <div class="flex items-center gap-2 cursor-pointer" @click="goToStep(1)">
            <div :class="step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'" class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors hover:opacity-80">
              <Check v-if="step > 1" class="w-4 h-4" />
              <span v-else>1</span>
            </div>
            <span class="text-sm font-medium" :class="{'text-primary': step >= 1}">{{ $t('projects.columns.repository') }}</span>
          </div>
          <div class="flex-1 h-px bg-border"></div>
          <div class="flex items-center gap-2" :class="{'cursor-pointer': step > 2}" @click="goToStep(2)">
            <div :class="step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'" class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors hover:opacity-80">
              <Check v-if="step > 2" class="w-4 h-4" />
              <span v-else>2</span>
            </div>
            <span class="text-sm font-medium" :class="{'text-primary': step >= 2}">{{ $t('projects.columns.branch') }}</span>
          </div>
          <div class="flex-1 h-px bg-border"></div>
          <div class="flex items-center gap-2" :class="{'cursor-pointer': step > 3}" @click="goToStep(3)">
            <div :class="step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'" class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors hover:opacity-80">
              <Check v-if="step > 3" class="w-4 h-4" />
              <span v-else>3</span>
            </div>
            <span class="text-sm font-medium" :class="{'text-primary': step >= 3}">Lockfile</span>
          </div>
          <div class="flex-1 h-px bg-border"></div>
          <div class="flex items-center gap-2">
            <div :class="step >= 4 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'" class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">4</div>
            <span class="text-sm font-medium" :class="{'text-primary': step >= 4}">{{ $t('project_detail.configuration') }}</span>
          </div>
        </div>

        <!-- Step 1: Select Repository -->
        <Card v-if="step === 1" class="h-full flex flex-col">
          <CardHeader>
            <CardTitle>{{ $t('create_project.step_1_title') }}</CardTitle>
            <div class="mt-4 relative">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    v-model="repoSearchQuery"
                    type="text"
                    :placeholder="$t('create_project.repo_search')"
                    class="w-full pl-9 pr-4 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
          </CardHeader>
          <CardContent class="flex-1 overflow-hidden flex flex-col">
            <div v-if="projectStore.loading" class="flex items-center justify-center py-12">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>

            <div v-else class="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[400px]">
              <div v-if="filteredRepositories.length === 0" class="text-center py-8 text-muted-foreground">
                {{ $t('create_project.no_repos') }}
              </div>
              <div
                v-for="repo in filteredRepositories"
                :key="repo.id"
                @click="selectRepository(repo)"
                class="group p-4 border rounded-lg cursor-pointer hover:border-primary hover:bg-accent/50 transition-all duration-200"
              >
                <div class="flex justify-between items-center">
                  <div class="flex items-center gap-3">
                    <div class="p-2 rounded-md bg-secondary group-hover:bg-background transition-colors">
                        <Lock v-if="repo.private" class="w-4 h-4 text-muted-foreground" />
                        <Globe v-else class="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 class="font-medium group-hover:text-primary transition-colors">{{ repo.fullName }}</h3>
                      <p class="text-xs text-muted-foreground">{{ repo.private ? 'Private' : 'Public' }}</p>
                    </div>
                  </div>
                  <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                      <span class="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">{{ $t('create_project.select') }}</span>
                  </div>
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
        <Card v-if="step === 2" class="h-full flex flex-col">
          <CardHeader>
            <CardTitle>{{ $t('create_project.step_2_title') }}</CardTitle>
            <p class="text-sm text-muted-foreground mt-1">{{ $t('projects.columns.repository') }}: {{ formData.repositoryName }}</p>
            <div class="mt-4 relative">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    v-model="branchSearchQuery"
                    type="text"
                    :placeholder="$t('create_project.branch_search')"
                    class="w-full pl-9 pr-4 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
          </CardHeader>
          <CardContent class="flex-1 overflow-hidden flex flex-col">
            <div v-if="projectStore.loading" class="flex items-center justify-center py-12">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>

            <div v-else class="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[400px]">
              <div v-if="filteredBranches.length === 0" class="text-center py-8 text-muted-foreground">
                {{ $t('create_project.no_branches') }}
              </div>
              <div
                v-for="branch in filteredBranches"
                :key="branch.name"
                @click="selectBranch(branch.name)"
                class="group p-4 border rounded-lg cursor-pointer hover:border-primary hover:bg-accent/50 transition-all duration-200"
              >
                <div class="flex justify-between items-center">
                  <div class="flex items-center gap-3">
                    <div class="p-2 rounded-md bg-secondary group-hover:bg-background transition-colors">
                        <GitBranch class="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 class="font-medium group-hover:text-primary transition-colors">{{ branch.name }}</h3>
                      <p v-if="branch.protected" class="text-xs text-yellow-600 font-medium bg-yellow-100 px-1.5 py-0.5 rounded inline-block mt-1">Protected</p>
                    </div>
                  </div>
                  <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                      <span class="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">{{ $t('create_project.select') }}</span>
                  </div>
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
                <p v-if="cronDescription" class="text-sm text-primary font-medium mt-1">
                    {{ cronDescription }}
                </p>
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
  </DashboardLayout>
</template>
