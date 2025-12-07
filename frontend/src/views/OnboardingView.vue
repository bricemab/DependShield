<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { toast } from 'vue-sonner';
import Card from '../components/ui/Card.vue';
import CardContent from '../components/ui/CardContent.vue';
import { Rocket, Building, ShieldCheck } from 'lucide-vue-next';
import api from '../lib/axios';

const router = useRouter();
const authStore = useAuthStore();
const step = ref(1);
const loading = ref(false);

const form = ref({
  role: '',
  companySize: '',
  discoverySource: '',
  organizationName: `${authStore.user?.username || 'My'}'s Organization`
});

// Enums from Backend
const ROLES = [
  { value: 'DEVELOPER', label: 'Software Developer' },
  { value: 'CTO', label: 'CTO / Tech Lead' },
  { value: 'FREELANCER', label: 'Freelancer' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'SECURITY_AUDITOR', label: 'Security Auditor' },
  { value: 'OTHER', label: 'Other' }
];

const SIZES = [
  { value: 'SOLO', label: 'Just me (Solo)' },
  { value: 'STARTUP', label: '2-10 employees (Startup)' },
  { value: 'SCALEUP', label: '11-50 employees (Scale-up)' },
  { value: 'ENTERPRISE', label: '50+ employees (Enterprise)' }
];

const SOURCES = [
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'GITHUB', label: 'GitHub' },
  { value: 'FRIEND', label: 'Friend / Colleague' },
  { value: 'NEWSLETTER', label: 'Newsletter' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'OTHER', label: 'Other' }
];

const canProceedStep1 = computed(() => form.value.role && form.value.companySize);
const canProceedStep2 = computed(() => form.value.organizationName.length > 2);
const canProceedStep3 = computed(() => form.value.discoverySource);

const nextStep = () => {
    if (step.value === 1 && canProceedStep1.value) step.value = 2;
    else if (step.value === 2 && canProceedStep2.value) step.value = 3;
};

const submitOnboarding = async () => {
  if (!canProceedStep3.value) return;
  loading.value = true;
  try {
    const res = await api.post('/users/onboarding', form.value);
    
    // Update local user state
    if (authStore.user) {
        authStore.user.isOnboarded = true;
        // Ideally fetch full user profile again, but let's assume success
    }

    toast.success("Welcome aboard! 🚀");
    router.push('/dashboard');
  } catch (error) {
    toast.error("Something went wrong. Please try again.");
    console.error(error);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-muted/30 flex items-center justify-center p-4">
    <div class="w-full max-w-lg space-y-8">
        <!-- Logo / Header -->
        <div class="text-center space-y-2">
             <div class="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-2">
                 <ShieldCheck class="w-8 h-8 text-primary" />
             </div>
             <h1 class="text-3xl font-bold tracking-tight">Welcome to DependShield</h1>
             <p class="text-muted-foreground">Let's set up your workspace in less than a minute.</p>
        </div>

        <Card class="border-border/50 shadow-xl">
             <!-- Steps Indicator -->
             <div class="flex items-center justify-between px-8 py-4 border-b bg-muted/20">
                 <div class="flex items-center gap-2">
                     <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors', step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground']">1</div>
                     <span :class="['text-sm font-medium', step >= 1 ? 'text-foreground' : 'text-muted-foreground']">Profile</span>
                 </div>
                 <div class="h-px bg-border w-10"></div>
                 <div class="flex items-center gap-2">
                     <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors', step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground']">2</div>
                     <span :class="['text-sm font-medium', step >= 2 ? 'text-foreground' : 'text-muted-foreground']">Organization</span>
                 </div>
                 <div class="h-px bg-border w-10"></div>
                 <div class="flex items-center gap-2">
                     <div :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors', step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground']">3</div>
                     <span :class="['text-sm font-medium', step >= 3 ? 'text-foreground' : 'text-muted-foreground']">Start</span>
                 </div>
             </div>

             <CardContent class="p-8 min-h-[300px] flex flex-col justify-center">
                 
                 <!-- Step 1: Profile -->
                 <div v-if="step === 1" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                     <div class="space-y-4">
                         <div class="space-y-2">
                             <label class="text-sm font-medium">What is your role?</label>
                             <select v-model="form.role" class="w-full px-3 py-2.5 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                                 <option value="" disabled selected>Select a role...</option>
                                 <option v-for="role in ROLES" :key="role.value" :value="role.value">{{ role.label }}</option>
                             </select>
                         </div>
                          <div class="space-y-2">
                             <label class="text-sm font-medium">How large is your company?</label>
                             <select v-model="form.companySize" class="w-full px-3 py-2.5 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                                 <option value="" disabled selected>Select company size...</option>
                                 <option v-for="size in SIZES" :key="size.value" :value="size.value">{{ size.label }}</option>
                             </select>
                         </div>
                     </div>
                 </div>

                 <!-- Step 2: Organization -->
                 <div v-else-if="step === 2" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div class="space-y-4">
                         <div class="space-y-2">
                             <label class="text-sm font-medium">Naming your Workspace</label>
                             <p class="text-xs text-muted-foreground mb-2">This is the name of your default organization. You can invite team members later.</p>
                             <div class="relative">
                                 <Building class="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                 <input 
                                    v-model="form.organizationName"
                                    type="text" 
                                    class="w-full pl-9 pr-3 py-2.5 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="Acme Corp"
                                 />
                             </div>
                         </div>
                     </div>
                 </div>

                 <!-- Step 3: Source -->
                 <div v-else-if="step === 3" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div class="space-y-4">
                         <div class="space-y-2">
                             <label class="text-sm font-medium">How did you hear about us?</label>
                             <select v-model="form.discoverySource" class="w-full px-3 py-2.5 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                                 <option value="" disabled selected>Select source...</option>
                                 <option v-for="source in SOURCES" :key="source.value" :value="source.value">{{ source.label }}</option>
                             </select>
                         </div>

                         <div class="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 rounded-lg text-sm text-blue-800 dark:text-blue-300 flex items-start gap-3">
                             <Rocket class="w-5 h-5 shrink-0" />
                             <div class="space-y-1">
                                 <p class="font-semibold">Almost there!</p>
                                 <p>We've prepared your dashboard. By clicking "Get Started", you agree to our Terms of Service.</p>
                             </div>
                         </div>
                     </div>
                 </div>

             </CardContent>

             <div class="px-8 pb-8 pt-0 flex justify-end">
                 <button
                    v-if="step > 1"
                    @click="step--"
                    class="mr-auto text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
                 >
                     Back
                 </button>

                 <button
                    v-if="step < 3"
                    @click="nextStep"
                    :disabled="step === 1 ? !canProceedStep1 : !canProceedStep2"
                    class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-10 px-8 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                 >
                     Continue
                 </button>
                 <button
                    v-else
                    @click="submitOnboarding"
                    :disabled="!canProceedStep3 || loading"
                    class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-10 px-8 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                 >
                     <span v-if="loading" class="mr-2">Loading...</span>
                     Get Started
                 </button>
             </div>
        </Card>
    </div>
  </div>
</template>
