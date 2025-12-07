<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from '../../stores/auth';
import api from '../../lib/axios';
import Card from '../../components/ui/Card.vue';
import CardHeader from '../../components/ui/CardHeader.vue';
import CardTitle from '../../components/ui/CardTitle.vue';
import CardDescription from '../../components/ui/CardDescription.vue';
import CardContent from '../../components/ui/CardContent.vue';

const authStore = useAuthStore();
const user = authStore.user;

const scanSummary = ref(false);
const marketing = ref(false);

const updateNotifications = async () => {
    try {
        // Need to preserve theme/lang settings
        const currentSettings = user?.settings || {};
        
        await api.patch('/users/me', {
            settings: {
                ...currentSettings,
                notifications: {
                    scanSummary: scanSummary.value,
                    marketing: marketing.value
                }
            }
        });
        await authStore.fetchUser();
    } catch (e) {
        console.error("Failed to save notification settings", e);
    }
};

onMounted(() => {
    if (user?.settings?.notifications) {
        scanSummary.value = user.settings.notifications.scanSummary || false;
        marketing.value = user.settings.notifications.marketing || false;
    }
});

watch([scanSummary, marketing], updateNotifications);
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-2xl font-semibold tracking-tight">Notifications</h3>
      <p class="text-sm text-muted-foreground">
        Configure how you receive alerts and reports.
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
        <CardDescription>Receive weekly reports and critical alerts.</CardDescription>
      </CardHeader>
      <CardContent>
         <div class="space-y-4">
             <div class="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0">
                 <div>
                    <div class="font-medium">Scan Summaries</div>
                     <div class="text-sm text-muted-foreground">Send a summary email after every scan.</div>
                 </div>
                 <div class="flex items-center">
                    <input type="checkbox" v-model="scanSummary" class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                 </div>
             </div>
             
             <div class="flex items-center justify-between">
                 <div>
                    <div class="font-medium">Marketing Emails</div>
                     <div class="text-sm text-muted-foreground">Receive updates about new features.</div>
                 </div>
                 <div class="flex items-center">
                    <input type="checkbox" v-model="marketing" class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                 </div>
             </div>
         </div>
      </CardContent>
    </Card>
  </div>
</template>
