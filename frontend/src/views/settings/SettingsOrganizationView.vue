<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import Card from '../../components/ui/Card.vue';
import CardHeader from '../../components/ui/CardHeader.vue';
import CardTitle from '../../components/ui/CardTitle.vue';
import CardDescription from '../../components/ui/CardDescription.vue';
import CardContent from '../../components/ui/CardContent.vue';
import CardFooter from '../../components/ui/CardFooter.vue';
import { useAuthStore } from '../../stores/auth';
import api from '../../lib/axios';
import { toast } from 'vue-sonner';
import { Loader2 } from 'lucide-vue-next';

const authStore = useAuthStore();
const router = useRouter();

const isLoading = ref(false);
const orgName = ref('');
const orgId = ref<number | null>(null);
const members = ref<any[]>([]);

// Fetch User's Organization
const fetchOrganization = async () => {
    try {
        isLoading.value = true;
        const res = await api.get('/organizations');
        if (res.data && res.data.length > 0) {
            // Find the active organization or fallback to the first one
            const activeOrgId = authStore.activeOrganizationId;
            const org = res.data.find((o: any) => o.id == activeOrgId) || res.data[0];
            
            orgName.value = org.name;
            orgId.value = org.id;
        } else {
             orgName.value = "";
        }
    } catch (error) {
        console.error("Failed to fetch organization", error);
        toast.error('Failed to fetch organization details.');
    } finally {
        isLoading.value = false;
    }
};

const updateOrganization = async () => {
    if (!orgId.value) return;
    try {
        isLoading.value = true;
        await api.patch(`/organizations/${orgId.value}`, { name: orgName.value });
        await authStore.fetchUser();
        toast.success('Organization name updated successfully.');
    } catch (error) {
        console.error("Failed to update organization", error);
         toast.error('Failed to update organization.');
    } finally {
        isLoading.value = false;
    }
};

const inviteEmail = ref('');
const isInviting = ref(false);
const pendingInvites = ref<any[]>([]);

const fetchMembersAndInvites = async () => {
     if (!authStore.activeOrganizationId) return;
     const orgIdVal = authStore.activeOrganizationId;

     try {
         // 1. Fetch Members
         const res = await api.get(`/organizations/${orgIdVal}`);
         if (res.data) {
             members.value = res.data.users || [];
         }

          // 2. Fetch Pending Invites
         const invitesRes = await api.get(`/invitations/organization/${orgIdVal}`);
         if (invitesRes.data) {
             pendingInvites.value = invitesRes.data;
         }

     } catch (err) {
         console.error("Failed to load members/invites", err);
     }
};

const sendInvite = async () => {
    if (!inviteEmail.value || !authStore.activeOrganizationId) return;
    
    try {
        isInviting.value = true;
        await api.post(`/invitations/organization/${authStore.activeOrganizationId}`, {
            email: inviteEmail.value
        });
        toast.success(`Invitation sent to ${inviteEmail.value}`);
        inviteEmail.value = '';
        await fetchMembersAndInvites();
    } catch (error: any) {
        console.error("Failed to send invite", error);
        toast.error(error.response?.data?.message || 'Failed to send invitation.');
    } finally {
        isInviting.value = false;
    }
};

const cancelInvite = async (id: number) => {
    try {
        await api.delete(`/invitations/${id}`);
        toast.success('Invitation cancelled');
        await fetchMembersAndInvites();
    } catch (error) {
        toast.error('Failed to cancel invitation');
    }
};

const isLeaving = ref(false);

const leaveOrganization = async () => {
    if (!confirm(`Are you sure you want to leave ${orgName.value}?`)) return;

    try {
        isLeaving.value = true;
        const currentOrgId = authStore.activeOrganizationId;
        
        await api.delete(`/organizations/${currentOrgId}/leave`);
        toast.success('You have left the organization.');
        
        // Refresh user to update org list
        await authStore.fetchUser();
        
        if (!authStore.user?.organizations || authStore.user.organizations.length === 0) {
             router.push('/onboarding');
        } else {
             router.push('/dashboard');
        }
    } catch (error: any) {
        console.error("Failed to leave organization", error);
        toast.error(error.response?.data?.message || 'Failed to leave organization.');
    } finally {
        isLeaving.value = false;
    }
};

watch(() => authStore.activeOrganizationId, () => {
    // Reload data when switching orgs
    fetchOrganization();
    fetchMembersAndInvites();
});

onMounted(async () => {
    await fetchOrganization();
    fetchMembersAndInvites();
});
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-2xl font-semibold tracking-tight">Organization</h3>
      <p class="text-sm text-muted-foreground">
        Manage your team and workspace settings.
      </p>
    </div>

    <!-- General Settings -->
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>Display name and visibility.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-2">
            <label class="text-sm font-medium">Organization Name</label>
            <input 
                v-model="orgName"
                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-w-md"
                placeholder="Acme Corp"
            />
        </div>
      </CardContent>
      <CardFooter class="border-t bg-muted/20 !px-6 !py-4 ">
          <button 
            @click="updateOrganization"
            class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
          >
            Save Changes
          </button>
      </CardFooter>
    </Card>

    <!-- Members -->
    <Card>
        <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Manage who has access to this organization.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
            <!-- Invite Form -->
            <div class="flex gap-2 items-end">
                <div class="grid gap-2 flex-1">
                    <label class="text-sm font-medium">Invite by Email</label>
                    <input 
                        v-model="inviteEmail"
                        class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="colleague@company.com"
                        @keyup.enter="sendInvite"
                    />
                </div>
                 <button 
                    @click="sendInvite"
                    :disabled="isInviting || !inviteEmail"
                    class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2"
                  >
                    <Loader2 v-if="isInviting" class="w-4 h-4 animate-spin mr-2" />
                    {{ isInviting ? 'Sending...' : 'Invite' }}
                  </button>
            </div>

            <!-- Active Members List -->
            <div class="space-y-4">
                <h4 class="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Members</h4>
                <div v-if="members.length === 0" class="text-sm text-muted-foreground italic">No members found.</div>
                <div v-else class="space-y-2">
                    <div v-for="member in members" :key="member.id" class="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                {{ member.username?.substring(0, 2).toUpperCase() }}
                            </div>
                            <div>
                                <div class="font-medium text-sm">{{ member.username }}</div>
                            </div>
                        </div>
                        <div class="text-xs text-muted-foreground">Member</div>
                    </div>
                </div>
            </div>

            <!-- Pending Invitations List -->
            <div v-if="pendingInvites.length > 0" class="space-y-4 pt-4 border-t border-border/50">
                <h4 class="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pending Invitations</h4>
                 <div class="space-y-2">
                    <div v-for="invite in pendingInvites" :key="invite.id" class="flex items-center justify-between p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 font-bold text-xs">
                                <span class="animate-pulse">●</span>
                            </div>
                            <div>
                                <div class="font-medium text-sm">{{ invite.email }}</div>
                                <div class="text-xs text-muted-foreground">Sent {{ new Date(invite.createdAt).toLocaleDateString() }}</div>
                            </div>
                        </div>
                         <button 
                            @click="cancelInvite(invite.id)"
                            class="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>

    <!-- Danger Zone -->
    <Card class="border-destructive/50">
        <CardHeader>
            <CardTitle class="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Destructive actions for this organization.</CardDescription>
        </CardHeader>
        <CardContent>
            <div class="flex items-center justify-between">
                <div>
                     <h4 class="text-sm font-medium">Leave Organization</h4>
                     <p class="text-sm text-muted-foreground">
                        Revoke your access to this organization. You will need to be re-invited to join again.
                     </p>
                </div>
                <button
                    @click="leaveOrganization"
                    :disabled="isLeaving"
                    class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 px-3"
                >
                    <Loader2 v-if="isLeaving" class="w-4 h-4 animate-spin mr-2" />
                    {{ isLeaving ? 'Leaving...' : 'Leave Organization' }}
                </button>
            </div>
        </CardContent>
    </Card>
  </div>
</template>
