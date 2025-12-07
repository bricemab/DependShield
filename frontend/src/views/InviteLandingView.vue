<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../lib/axios';
import { useAuthStore } from '../stores/auth';
import { Loader2, CheckCircle2, ShieldCheck } from 'lucide-vue-next';
import { toast } from 'vue-sonner';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const token = route.params.token as string;
const isLoading = ref(true);
const inviteDetails = ref<any>(null);
const error = ref<string | null>(null);
const processing = ref(false);

onMounted(async () => {
    if (!token) {
        error.value = "Invalid invitation link.";
        isLoading.value = false;
        return;
    }

    try {
        // Validate token and get details
        const res = await api.get(`/invitations/token/${token}`);
        inviteDetails.value = res.data;
    } catch (err: any) {
        console.error(err);
        error.value = err.response?.data?.message || "Invitation not found or expired.";
    } finally {
        isLoading.value = false;
    }
});

const handleAccept = async () => {
    processing.value = true;
    try {
        await api.post('/invitations/accept', { token });
        toast.success(`You have joined ${inviteDetails.value.organizationName}!`);
        // Refresh user to get new org context
        await authStore.fetchUser();
        router.push('/dashboard');
    } catch (err: any) {
         toast.error(err.response?.data?.message || "Failed to accept invitation.");
    } finally {
        processing.value = false;
    }
};

const handleDecline = async () => {
    if (!confirm('Are you sure you want to decline this invitation?')) return;
    processing.value = true;
    try {
        await api.post('/invitations/decline', { token });
        toast.info('Invitation declined.');
        router.push('/');
    } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to decline invitation.");
    } finally {
        processing.value = false;
    }
};

const handleLoginRedirect = () => {
    // Store token for post-login processing
    localStorage.setItem('pending_invite', token);
    
    // Redirect to backend auth (GitHub)
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    window.location.href = `${apiUrl}/auth/github`; 
};
</script>

<template>
    <div class="min-h-screen flex flex-col items-center justify-center bg-muted/20 p-4">
        <div class="w-full max-w-md bg-background border border-border rounded-xl shadow-lg p-8 text-center relative overflow-hidden">
             <!-- Top Decoration -->
             <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
             <div class="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

            <div class="flex justify-center mb-6">
                <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <ShieldCheck class="w-8 h-8 text-primary" />
                </div>
            </div>

            <div v-if="isLoading" class="py-12">
                 <Loader2 class="w-8 h-8 animate-spin mx-auto text-primary" />
                 <p class="mt-4 text-muted-foreground">Verifying invitation...</p>
            </div>

            <div v-else-if="error" class="py-8">
                <div class="text-red-500 font-medium text-lg mb-2">Unavailable</div>
                <p class="text-muted-foreground">{{ error }}</p>
                <button @click="router.push('/')" class="mt-6 text-primary hover:underline text-sm font-medium">
                    Go to Home
                </button>
            </div>

            <div v-else class="space-y-6 relative z-10">
                <div>
                     <h1 class="text-2xl font-bold tracking-tight mb-2">You're invited!</h1>
                     <p class="text-muted-foreground">
                        <span class="font-semibold text-foreground">{{ inviteDetails.inviterName }}</span> 
                        invited you to join 
                        <span class="font-semibold text-foreground">{{ inviteDetails.organizationName }}</span>
                        on DependShield.
                     </p>
                </div>

                <div class="bg-muted/50 p-4 rounded-lg border border-border/50 text-sm">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-muted-foreground">Organization</span>
                        <span class="font-medium">{{ inviteDetails.organizationName }}</span>
                    </div>
                     <div class="flex items-center justify-between">
                        <span class="text-muted-foreground">Invited Email</span>
                        <span class="font-medium">{{ inviteDetails.email }}</span>
                    </div>
                </div>

                <div v-if="authStore.isAuthenticated">
                    <div class="flex gap-3">
                         <button
                            @click="handleAccept"
                            :disabled="processing"
                            class="flex-1 h-11 inline-flex items-center justify-center rounded-lg text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            <Loader2 v-if="processing" class="w-4 h-4 animate-spin mr-2" />
                            {{ processing ? 'Joining...' : 'Accept Invitation' }}
                        </button>
                        <button
                            @click="handleDecline"
                            :disabled="processing"
                            class="flex-1 h-11 inline-flex items-center justify-center rounded-lg text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive/10 text-destructive hover:bg-destructive/20"
                        >
                            Decline
                        </button>
                    </div>

                    <p class="text-xs text-muted-foreground mt-4">
                        Logged in as <span class="font-medium">{{ authStore.user?.username }}</span>. 
                        <button class="text-primary hover:underline" @click="authStore.logout(); router.go(0)">Not you?</button>
                    </p>
                </div>

                <div v-else class="space-y-3">
                     <button
                        @click="handleLoginRedirect"
                        class="w-full h-11 inline-flex items-center justify-center rounded-lg text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-[#24292F] text-white hover:bg-[#24292F]/90 dark:bg-white dark:text-[#24292F] dark:hover:bg-white/90 gap-2"
                    >
                        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        Log in with GitHub to Join
                    </button>
                    <p class="text-xs text-muted-foreground">
                        We will create a new account if you don't have one.
                    </p>
                </div>
            </div>
        </div>
        
        <div class="mt-8 text-center text-xs text-muted-foreground">
            &copy; 2025 DependShield Security.
        </div>
    </div>
</template>
