<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Plus, Trash2, Webhook, Key, Loader2, Copy, Check } from 'lucide-vue-next';
import Button from '@/components/ui/button/Button.vue';
import CardHeader from '@/components/ui/CardHeader.vue';
import CardTitle from '@/components/ui/CardTitle.vue';
import Card from '@/components/ui/Card.vue';
import Dialog from '@/components/ui/Dialog.vue';
import { Badge } from '@/components/ui/badge';
import api from '../../lib/axios';
import { useAuthStore } from '../../stores/auth';
import { toast } from 'vue-sonner';

const authStore = useAuthStore();
const apiKeys = ref<any[]>([]);
const webhooks = ref<any[]>([]);
const isLoadingKeys = ref(false);
const isLoadingWebhooks = ref(false);

// API Keys State
const newKeyLabel = ref('');
const isCreatingKey = ref(false);
const createdKeyToken = ref('');
const showNewKeyDialog = ref(false);
const copied = ref(false);

// Webhooks State
const newWebhookUrl = ref('');
const isCreatingWebhook = ref(false);
const showNewWebhookDialog = ref(false);
const selectedEvents = ref(['scan.completed', 'scan.failed']);

// -- API Keys Logic --

const fetchApiKeys = async () => {
    if (!authStore.activeOrganizationId) return;
    isLoadingKeys.value = true;
    try {
        const res = await api.get(`/organizations/${authStore.activeOrganizationId}/api-keys`);
        apiKeys.value = res.data;
    } catch (e) {
        toast.error('Failed to load API keys');
    } finally {
        isLoadingKeys.value = false;
    }
};

const createApiKey = async () => {
    if (!newKeyLabel.value || !authStore.activeOrganizationId) return;
    isCreatingKey.value = true;
    try {
        const res = await api.post(`/organizations/${authStore.activeOrganizationId}/api-keys`, { label: newKeyLabel.value });
        createdKeyToken.value = res.data.token;
        await fetchApiKeys();
        newKeyLabel.value = '';
        // Don't close dialog, show token first
    } catch (e) {
        toast.error('Failed to create API key');
    } finally {
        isCreatingKey.value = false;
    }
};

const deleteApiKey = async (id: string) => {
    if (!confirm('Are you sure? This action is irreversible.')) return;
    if (!authStore.activeOrganizationId) return;
    try {
        await api.delete(`/organizations/${authStore.activeOrganizationId}/api-keys/${id}`);
        await fetchApiKeys();
        toast.success('API Key revoked');
    } catch (e) {
        toast.error('Failed to revoke API Key');
    }
};

const copyToken = () => {
    navigator.clipboard.writeText(createdKeyToken.value);
    copied.value = true;
    setTimeout(() => copied.value = false, 2000);
};

const closeKeyDialog = () => {
    showNewKeyDialog.value = false;
    createdKeyToken.value = ''; // Clear token on close for security
};

// -- Webhooks Logic --

const fetchWebhooks = async () => {
    if (!authStore.activeOrganizationId) return;
    isLoadingWebhooks.value = true;
    try {
        const res = await api.get(`/organizations/${authStore.activeOrganizationId}/webhooks`);
        webhooks.value = res.data;
    } catch (e) {
        // Silent fail or toast if needed, backend might return 403 if not PRO
    } finally {
        isLoadingWebhooks.value = false;
    }
};

const createWebhook = async () => {
    if (!newWebhookUrl.value || !authStore.activeOrganizationId) return;
    isCreatingWebhook.value = true;
    try {
        await api.post(`/organizations/${authStore.activeOrganizationId}/webhooks`, {
            url: newWebhookUrl.value,
            events: selectedEvents.value,
            type: 'GENERIC' // Simple default for now
        });
        await fetchWebhooks();
        showNewWebhookDialog.value = false;
        newWebhookUrl.value = '';
        toast.success('Webhook added');
    } catch (e) {
        toast.error('Failed to add webhook. Ensure you have PRO plan.');
    } finally {
        isCreatingWebhook.value = false;
    }
};

const deleteWebhook = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    try {
        await api.delete(`/organizations/${authStore.activeOrganizationId}/webhooks/${id}`);
        await fetchWebhooks();
        toast.success('Webhook removed');
    } catch (e) {
        toast.error('Failed to remove webhook');
    }
};

onMounted(() => {
    fetchApiKeys();
    fetchWebhooks();
});
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-lg font-medium">Integrations</h3>
      <p class="text-sm text-muted-foreground">Manage external access and notifications.</p>
    </div>

    <!-- API Access -->
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
            <div>
                <CardTitle class="flex items-center gap-2">
                    <Key class="w-5 h-5" />
                    API Access
                </CardTitle>
                <CardDescription>Generate personal access tokens for the DependShield API.</CardDescription>
            </div>
            <Button size="sm" @click="showNewKeyDialog = true">
                <Plus class="w-4 h-4 mr-2" />
                Generate Token
            </Button>
            <Dialog :show="showNewKeyDialog" title="Generate New API Token" description="Create a new token to access the API programmatically." @close="closeKeyDialog">
                    <div v-if="!createdKeyToken" class="space-y-4 py-4">
                        <div class="space-y-2">
                            <label class="text-sm font-medium">Token Label</label>
                            <input 
                                v-model="newKeyLabel"
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="e.g. CI/CD Pipeline"
                                @keyup.enter="createApiKey"
                            />
                        </div>
                    </div>

                    <div v-else class="space-y-4 py-4">
                         <div class="bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded p-3 text-sm">
                            Make sure to copy your personal access token now. You won’t be able to see it again!
                        </div>
                        <div class="flex items-center gap-2">
                            <code class="flex-1 bg-muted p-2 rounded border font-mono text-sm break-all select-all">{{ createdKeyToken }}</code>
                            <Button size="icon" variant="outline" @click="copyToken">
                                <Check v-if="copied" class="w-4 h-4 text-green-500" />
                                <Copy v-else class="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <template #footer>
                        <Button v-if="!createdKeyToken" @click="createApiKey" :disabled="isCreatingKey || !newKeyLabel">
                            <Loader2 v-if="isCreatingKey" class="w-4 h-4 animate-spin mr-2" />
                            Generate
                        </Button>
                        <Button v-else @click="closeKeyDialog">Done</Button>
                    </template>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
          <div v-if="isLoadingKeys" class="flex justify-center p-4"><Loader2 class="animate-spin" /></div>
          <div v-else-if="apiKeys.length === 0" class="text-sm text-muted-foreground text-center py-4">
              You haven't generated any API tokens yet.
          </div>
          <div v-else class="space-y-2">
               <div v-for="key in apiKeys" :key="key.id" class="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div class="space-y-1">
                        <div class="font-medium text-sm flex items-center gap-2">
                            {{ key.label }}
                            <Badge variant="outline" class="text-[10px] h-5 font-mono">{{ key.prefix }}</Badge>
                        </div>
                        <div class="text-xs text-muted-foreground">Created {{ new Date(key.createdAt).toLocaleDateString() }}</div>
                    </div>
                    <Button variant="ghost" size="icon" class="text-destructive hover:text-destructive hover:bg-destructive/10" @click="deleteApiKey(key.id)">
                        <Trash2 class="w-4 h-4" />
                    </Button>
               </div>
          </div>
      </CardContent>
    </Card>

    <!-- Global Webhooks -->
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
            <div>
                 <CardTitle class="flex items-center gap-2">
                    <Webhook class="w-5 h-5" />
                    Global Webhooks
                 </CardTitle>
                 <CardDescription>Receive notifications for events across all projects in this organization.</CardDescription>
            </div>
             <Button size="sm" variant="outline" :disabled="authStore.activeOrganization?.plan === 'STARTER'" @click="showNewWebhookDialog = true">
                <Plus class="w-4 h-4 mr-2" />
                Add Webhook
            </Button>

            <Dialog :show="showNewWebhookDialog" title="Add Global Webhook" description="Enter the URL payload destination." @close="showNewWebhookDialog = false">
                     <div class="space-y-4 py-4">
                        <div class="space-y-2">
                            <label class="text-sm font-medium">Payload URL</label>
                            <input 
                                v-model="newWebhookUrl"
                                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="https://api.example.com/webhooks/dependshield"
                            />
                        </div>
                    </div>
                    <template #footer>
                        <Button @click="createWebhook" :disabled="isCreatingWebhook || !newWebhookUrl">
                            <Loader2 v-if="isCreatingWebhook" class="w-4 h-4 animate-spin mr-2" />
                            Add Webhook
                        </Button>
                    </template>
             </Dialog>
        </div>
      </CardHeader>
      <CardContent>
         <div v-if="authStore.activeOrganization?.plan === 'STARTER'" class="bg-muted p-4 rounded-lg text-center space-y-2 border border-dashed">
             <p class="text-sm font-medium">Available on PRO & Enterprise</p>
             <p class="text-xs text-muted-foreground">Global webhooks allow you to centrally manage notifications.</p>
             <Button size="sm" variant="secondary" class="mt-2 h-7" disabled>Upgrade Plan (Coming Soon)</Button>
         </div>

         <div v-else>
              <div v-if="isLoadingWebhooks" class="flex justify-center p-4"><Loader2 class="animate-spin" /></div>
              <div v-else-if="webhooks.length === 0" class="text-sm text-muted-foreground text-center py-4">
                  No global webhooks configured.
              </div>
              <div v-else class="space-y-2">
                  <div v-for="hook in webhooks" :key="hook.id" class="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                        <div class="space-y-1 overflow-hidden">
                            <div class="font-medium text-sm truncate max-w-md">{{ hook.url }}</div>
                            <div class="flex gap-2">
                                <Badge v-for="event in hook.events" :key="event" variant="secondary" class="text-[10px]">{{ event }}</Badge>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" class="text-destructive hover:text-destructive hover:bg-destructive/10" @click="deleteWebhook(hook.id)">
                            <Trash2 class="w-4 h-4" />
                        </Button>
                   </div>
              </div>
         </div>
      </CardContent>
    </Card>
  </div>
</template>
