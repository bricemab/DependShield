<script setup lang="ts">
import { FolderGit2, LayoutDashboard, ShieldAlert, Settings, BookOpen } from 'lucide-vue-next';
import LanguageSwitcher from './LanguageSwitcher.vue';
import ThemeToggle from './ThemeToggle.vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
</script>

<template>
  <aside class="w-64 border-r bg-card flex flex-col h-screen sticky top-0">
    <!-- Logo -->
    <div class="p-6 border-b">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <FolderGit2 class="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 class="text-lg font-bold">DependShield</h1>
          <p class="text-xs text-muted-foreground">Vulnerability Scanner</p>
          <span v-if="authStore.user" class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary mt-1 inline-block">
            {{ authStore.user.plan }} PLAN
          </span>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 p-4">
      <div class="space-y-1">
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
          active-class="bg-accent text-accent-foreground"
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

        <router-link
          to="/settings"
          class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          active-class="bg-accent text-accent-foreground"
        >
          <Settings class="w-4 h-4" />
          Settings
        </router-link>

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
    <div class="px-4 py-2 border-t flex items-center justify-between">
      <LanguageSwitcher />
      <ThemeToggle />
    </div>

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
</template>
