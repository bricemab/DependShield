<script setup lang="ts">
import Card from '../../components/ui/Card.vue';
import CardHeader from '../../components/ui/CardHeader.vue';
import CardTitle from '../../components/ui/CardTitle.vue';
import CardDescription from '../../components/ui/CardDescription.vue';
import CardContent from '../../components/ui/CardContent.vue';
import { Badge } from '@/components/ui/badge';

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
                <CardDescription>You are currently on the <strong>Starter</strong> plan.</CardDescription>
            </div>
            <Badge variant="default" class="mr-4">STARTER</Badge>
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
            <p class="text-xs text-muted-foreground pt-1">Free plan allows up to 3 active projects.</p>
        </div>
        
        <div class="mt-6">
            <button class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
                Upgrade to PRO
            </button>
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
