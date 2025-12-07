<script setup lang="ts">
import { Github } from 'lucide-vue-next';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';

const handleLogin = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  window.location.href = `${apiUrl}/auth/github`;
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background relative">
    <div class="absolute top-4 right-4">
      <LanguageSwitcher />
    </div>
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <img src="/logo.png" alt="DependShield" class="h-20 mb-4 object-contain mx-auto transition-transform hover:scale-105" />
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
