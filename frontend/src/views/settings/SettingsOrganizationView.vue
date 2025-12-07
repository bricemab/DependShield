<script setup lang="ts">
import { ref, onMounted } from 'vue';
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
// const { toast } = useToast();

const isLoading = ref(false);
const orgName = ref('');
const orgId = ref<number | null>(null);
const members = ref([]);

// Fetch User's Organization
const fetchOrganization = async () => {
    try {
        isLoading.value = true;
        const res = await api.get('/organizations');
        if (res.data && res.data.length > 0) {
            const org = res.data[0];
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
         toast({
            variant: 'destructive',
             title: 'Error',
            description: 'Failed to update organization.'
        });
    } finally {
        isLoading.value = false;
    }
};

onMounted(() => {
    fetchOrganization();
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

    <!-- Members (Placeholder) -->
    <Card>
        <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Invite your team to collaborate.</CardDescription>
        </CardHeader>
        <CardContent>
            <div class="text-center py-8 text-muted-foreground">
                <p>Team management is available on <strong>PRO</strong> and <strong>ENTERPRISE</strong> plans.</p>
                <button class="mt-4 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
                    Upgrade Plan
                </button>
            </div>
        </CardContent>
    </Card>
  </div>
</template>
