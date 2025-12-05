<script setup lang="ts">
import { Github } from 'lucide-vue-next';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';

const handleLogin = () => {
  window.location.href = 'http://localhost:3000/auth/github';
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background relative">
    <div class="absolute top-4 right-4">
      <LanguageSwitcher />
    </div>
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
          <svg class="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 class="text-4xl font-bold mb-2">DependShield</h1>
        <p class="text-muted-foreground">Vulnerability Scanner for Node.js Projects</p>
      </div>

      <div class="bg-card border rounded-xl p-8 shadow-lg">
        <h2 class="text-2xl font-semibold mb-2">{{ $t('auth.login_title') }}</h2>
        <p class="text-muted-foreground mb-6">{{ $t('auth.login_subtitle') }}</p>
        
        <button
          @click="handleLogin"
          class="w-full inline-flex items-center justify-center gap-3 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
        >
          <Github class="w-5 h-5" />
          {{ $t('auth.login_github') }}
        </button>

        <p class="text-xs text-muted-foreground text-center mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  </div>
</template>
