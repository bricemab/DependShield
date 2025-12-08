<script setup lang="ts">
import { ref, computed } from 'vue';
import Card from '../../components/ui/Card.vue';
import CardHeader from '../../components/ui/CardHeader.vue';
import CardTitle from '../../components/ui/CardTitle.vue';
import CardDescription from '../../components/ui/CardDescription.vue';
import CardContent from '../../components/ui/CardContent.vue';
import Button from '@/components/ui/button/Button.vue';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '../../stores/auth';
import api from '../../lib/axios';
import { Loader2 } from 'lucide-vue-next';
import { toast } from 'vue-sonner';

const authStore = useAuthStore();
const isLoadingCheckout = ref(false);
const isLoadingPortal = ref(false);

const currentPlan = computed(() => authStore.activeOrganization?.plan || 'STARTER');

const isOwner = computed(() => {
    const org = authStore.activeOrganization;
    if (!org) return false;
    // If ownerId is null, allow access (will auto-claim on backend)
    // Otherwise strict check
    return !org.ownerId || org.ownerId === authStore.user?.id;
});

const upgradeToPro = async () => {
    // ... same code ...
    // Note: buttons will be disabled/hidden, but safe to keep logic
    isLoadingCheckout.value = true;
    try {
        const res = await api.post('/billing/checkout', {
            plan: 'PRO',
            organizationId: authStore.activeOrganizationId
        });
        window.location.href = res.data.url;
    } catch (e) {
        toast.error('Failed to start checkout');
    } finally {
        isLoadingCheckout.value = false;
    }
};

const manageSubscription = async () => {
    // ... same code ...
    isLoadingPortal.value = true;
    try {
        const res = await api.post('/billing/portal', {
            organizationId: authStore.activeOrganizationId
        });
        window.location.href = res.data.url;
    } catch (e) {
        toast.error('Failed to open billing portal');
    } finally {
        isLoadingPortal.value = false;
    }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-2xl font-semibold tracking-tight">Billing & Plans</h3>
      <p class="text-sm text-muted-foreground">
        Manage your subscription and quotas.
      </p>
    </div>

    <!-- Current Plan -->
    <Card class="border-primary/50 bg-primary/5">
      <CardHeader>
        <div class="flex items-center justify-between">
            <div>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>You are currently on the <strong>{{ currentPlan }}</strong> plan.</CardDescription>
            </div>
            <Badge variant="default" class="mr-4">{{ currentPlan }}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div class="space-y-2">
            <div class="flex justify-between text-sm">
                <span>Projects</span>
                <span class="text-muted-foreground">0 / 3</span>
            </div>
            <div class="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div class="h-full bg-primary w-[0%]"></div>
            </div>
            <p class="text-xs text-muted-foreground pt-1" v-if="currentPlan === 'STARTER'">Free plan allows up to 3 active projects.</p>
             <p class="text-xs text-muted-foreground pt-1" v-else>Unlimited projects.</p>
        </div>
        
        <div class="mt-6 flex gap-3" v-if="isOwner">
            <Button v-if="currentPlan === 'STARTER'" @click="upgradeToPro" :disabled="isLoadingCheckout">
                <Loader2 v-if="isLoadingCheckout" class="w-4 h-4 animate-spin mr-2"/>
                Upgrade to PRO
            </Button>
            <Button v-else variant="outline" @click="manageSubscription" :disabled="isLoadingPortal">
                <Loader2 v-if="isLoadingPortal" class="w-4 h-4 animate-spin mr-2"/>
                Manage Subscription
            </Button>
        </div>
        <div class="mt-6 text-sm text-muted-foreground bg-secondary/50 p-3 rounded-md" v-else>
            Only the organization owner can manage billing and subscriptions.
        </div>
      </CardContent>
    </Card>

    <Card>
        <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>History of your payments.</CardDescription>
        </CardHeader>
        <CardContent>
             <div class="text-sm text-muted-foreground text-center py-4">No invoices found.</div>
        </CardContent>
    </Card>
  </div>
</template>
