<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useI18n } from 'vue-i18n';
import Card from '../../components/ui/Card.vue';
import CardHeader from '../../components/ui/CardHeader.vue';
import CardTitle from '../../components/ui/CardTitle.vue';
import CardDescription from '../../components/ui/CardDescription.vue';
import CardContent from '../../components/ui/CardContent.vue';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-vue-next';
import api from '../../lib/axios';
import { toast } from 'vue-sonner';

const authStore = useAuthStore();
const { locale } = useI18n();
const user = computed(() => authStore.user); // Make user reactive properly

const isSyncing = ref(false);

const syncGithub = async () => {
    isSyncing.value = true;
    try {
        await api.post('/users/me/sync');
        await authStore.fetchUser();
        toast.success('Profile synced with GitHub successfully.');
    } catch (e) {
        console.error("Failed to sync", e);
        toast.error('Failed to sync with GitHub.');
    } finally {
        isSyncing.value = false;
    }
};

const initials = computed(() => user.value?.username?.substring(0, 2).toUpperCase() || 'DS');

const theme = ref(localStorage.getItem('theme') || 'system');
const language = ref(localStorage.getItem('locale') || 'en');

const applyTheme = (val: string) => {
    const isDark = val === 'dark' || (val === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', val);
};

// Initial load
onMounted(() => {
    if (user.value?.settings) {
        if (user.value.settings.theme) {
            theme.value = user.value.settings.theme;
            applyTheme(theme.value);
        }
        if (user.value.settings.language) {
            language.value = user.value.settings.language;
            locale.value = language.value;
        }
    }
});

const updateSettings = async () => {
    // Apply changes locally
    applyTheme(theme.value);
    locale.value = language.value;
    localStorage.setItem('locale', language.value);

    // Save to Backend
    try {
        await api.patch('/users/me', {
            settings: {
                theme: theme.value,
                language: language.value,
                notifications: user.value?.settings?.notifications || {} // Preserve existing
            }
        });
        // Update store logic if needed, ideally re-fetch user
        await authStore.fetchUser();
    } catch (e) {
        console.error("Failed to save settings", e);
    }
};

watch(theme, updateSettings);
watch(language, updateSettings);

</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-2xl font-semibold tracking-tight">My Profile</h3>
      <p class="text-sm text-muted-foreground">
        Manage your personal information and preferences.
      </p>
    </div>

    <!-- User Identity Card -->
    <Card>
      <CardHeader>
        <div class="flex items-start justify-between">
            <div>
                <CardTitle>Identity</CardTitle>
                <CardDescription>Your personal details synced from GitHub.</CardDescription>
            </div>
            <Button variant="outline" size="sm" @click="syncGithub" :disabled="isSyncing">
                <RefreshCw class="w-4 h-4 mr-2" :class="{ 'animate-spin': isSyncing }" />
                {{ isSyncing ? 'Syncing...' : 'Sync from GitHub' }}
            </Button>
        </div>
      </CardHeader>
      <CardContent class="flex items-center gap-6">
        <div class="h-20 w-20 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center text-xl font-bold text-muted-foreground relative">
            <Avatar class="h-20 w-20">
                <AvatarImage :src="user?.avatarUrl" :alt="user?.username" />
                <AvatarFallback>{{ initials }}</AvatarFallback>
            </Avatar>
        </div>
        <div class="space-y-1">
          <h4 class="text-lg font-medium">{{ user?.username }}</h4>
          <p class="text-sm text-muted-foreground">{{ user?.email }}</p>
          <div class="flex gap-2 mt-2">
             <Badge variant="outline" class="uppercase text-xs" v-if="user?.role">{{ user.role }}</Badge>
             <Badge variant="secondary" class="text-xs">
                ID: {{ user?.id }}
             </Badge>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Preferences Card -->
    <Card>
        <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your experience.</CardDescription>
        </CardHeader>
        <CardContent>
            <div class="flex items-center justify-between py-4 border-b border-border/50 last:border-0">
                <div>
                    <p class="font-medium">Appearance</p>
                    <p class="text-sm text-muted-foreground">Select your preferred theme.</p>
                </div>
                <select v-model="theme" class="bg-background border rounded-md text-sm px-3 py-1.5 focus:ring-2 focus:ring-primary focus:outline-none">
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                </select>
            </div>
            
             <div class="flex items-center justify-between py-4">
                <div>
                    <p class="font-medium">Language</p>
                    <p class="text-sm text-muted-foreground">Select your preferred language.</p>
                </div>
                 <select v-model="language" class="bg-background border rounded-md text-sm px-3 py-1.5 focus:ring-2 focus:ring-primary focus:outline-none">
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                </select>
            </div>
        </CardContent>
    </Card>
  </div>
</template>
