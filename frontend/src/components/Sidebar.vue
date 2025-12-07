<script setup lang="ts">
import { FolderGit2, LayoutDashboard, ShieldAlert, Settings, BookOpen, ChevronDown, Building } from 'lucide-vue-next';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { ref, watch } from 'vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isSettingsOpen = ref(route.path.startsWith('/settings'));

watch(() => route.path, (newPath) => {
    if (newPath.startsWith('/settings')) {
        isSettingsOpen.value = true;
    }
});

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
</script>

<template>
  <aside class="w-64 border-r bg-card flex flex-col h-screen sticky top-0">
    <!-- Logo -->
    <div class="p-6 border-b">
      <div class="flex flex-col items-center justify-center text-center">
        <img src="/logo.png" alt="DependShield" class="h-12 mb-2" />
        <p class="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Vulnerability Scanner</p>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 p-4">
      <div class="space-y-1">
        <!-- Organization Label -->
        <div v-if="authStore.user?.organizations?.[0]" class="mb-4 px-3 py-2 bg-muted/50 rounded-lg border border-border/50 flex items-center gap-3">
            <div class="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                <Building class="h-4 w-4" />
            </div>
            <div class="overflow-hidden">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Workspace</p>
                <p class="text-sm font-semibold truncate">{{ authStore.user.organizations[0].name }}</p>
            </div>
        </div>

        <router-link
          to="/dashboard"
          class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          active-class="bg-accent text-accent-foreground"
        >
          <LayoutDashboard class="w-4 h-4" />
          Dashboard
        </router-link>

        <router-link
          to="/projects"
          class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          :class="{ 'bg-accent text-accent-foreground': route.path.startsWith('/projects') }"
        >
          <FolderGit2 class="w-4 h-4" />
          {{ $t('projects.title') }}
        </router-link>

        <router-link
          to="/vulnerabilities"
          class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          active-class="bg-accent text-accent-foreground"
        >
          <ShieldAlert class="w-4 h-4" />
          Vulnerabilities
        </router-link>

        <!-- Settings (Collapsible) -->
        <div>
          <button
            @click="isSettingsOpen = !isSettingsOpen"
            class="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            :class="{ 'bg-accent text-accent-foreground': route.path.startsWith('/settings') }"
          >
            <div class="flex items-center gap-3">
              <Settings class="w-4 h-4" />
              Settings
            </div>
            <ChevronDown
              class="w-4 h-4 transition-transform duration-200"
              :class="{ 'rotate-180': isSettingsOpen }"
            />
          </button>
          
          <div v-if="isSettingsOpen" class="mt-1 ml-4 space-y-1 border-l pl-2">
            <router-link
              to="/settings/profile"
              class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              active-class="bg-accent text-accent-foreground"
            >
              My Profile
            </router-link>
            <router-link
              to="/settings/organization"
              class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              active-class="bg-accent text-accent-foreground"
            >
              Organization
            </router-link>
            <router-link
              to="/settings/billing"
              class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              active-class="bg-accent text-accent-foreground"
            >
              Billing & Plans
            </router-link>
            <router-link
              to="/settings/notifications"
              class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              active-class="bg-accent text-accent-foreground"
            >
              Notifications
            </router-link>
          </div>
        </div>

        <a
          href="https://docs.dependshield.io"
          target="_blank"
          class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <BookOpen class="w-4 h-4" />
          Documentation
        </a>
      </div>    </nav>

    <!-- App Controls -->
    <!-- Controls moved to Settings -->
    <!-- <div class="px-4 py-2 border-t flex items-center justify-between">
      <LanguageSwitcher />
      <ThemeToggle />
    </div> -->

    <!-- User Section -->
    <div class="p-4 border-t">
      <button
        @click="handleLogout"
        class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        {{ $t('common.logout') }}
      </button>
    </div>
  </aside>
</template>
