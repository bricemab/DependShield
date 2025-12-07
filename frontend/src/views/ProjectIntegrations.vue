<template>
  <div class="space-y-6">
    <div class="bg-card rounded-lg border shadow-sm p-6">
      <h3 class="text-lg font-semibold mb-4">GitHub Actions Integration</h3>
      <p class="text-sm text-muted-foreground mb-4">
        Block insecure Pull Requests automatically by adding this workflow to your repository.
      </p>

      <div class="space-y-4">
        <div class="space-y-2">
            <h4 class="text-sm font-medium">1. Set Secrets</h4>
            <div class="bg-secondary/50 p-4 rounded-md text-sm space-y-2">
                <p>Go to <strong>Settings > Secrets and variables > Actions</strong> in your GitHub repo and add:</p>
                <ul class="list-disc list-inside text-muted-foreground ml-2 space-y-1">
                    <li><code class="bg-background px-1 py-0.5 rounded">DS_API_URL</code> : <span class="select-all">{{ apiUrl }}</span></li>
                    <li><code class="bg-background px-1 py-0.5 rounded">DS_PROJECT_ID</code> : <span class="select-all">{{ projectId }}</span></li>
                    <li><code class="bg-background px-1 py-0.5 rounded">DS_TOKEN</code> : <span class="text-indigo-400 font-mono">[Your API Token]</span></li>
                </ul>
            </div>
        </div>

        <div class="space-y-2">
            <div class="flex items-center justify-between">
                <h4 class="text-sm font-medium">2. Create Workflow File</h4>
                <button @click="copyWorkflow" class="text-xs text-primary hover:underline">
                    Copy YAML
                </button>
            </div>
            <p class="text-xs text-muted-foreground">
                Create a file at <code class="bg-secondary px-1 py-0.5 rounded">.github/workflows/dependshield.yml</code>
            </p>
            <div class="relative">
                <pre class="bg-slate-950 text-slate-50 p-4 rounded-md text-xs font-mono overflow-auto max-h-[400px]">{{ workflowYaml }}</pre>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { toast } from 'vue-sonner';

const props = defineProps<{
  projectId: number;
}>();

const apiUrl = window.location.origin.replace('5173', '3000'); // Simple heuristic for dev

const workflowYaml = computed(() => `name: DependShield Security Scan

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  security-check:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Trigger DependShield Scan
        id: scan
        run: |
          echo "Triggering scan for project \${{ secrets.DS_PROJECT_ID }}..."
          
          # 1. Trigger Scan
          RESPONSE=$(curl -s -X POST "\${{ secrets.DS_API_URL }}/projects/\${{ secrets.DS_PROJECT_ID }}/scans" \\
            -H "Authorization: Bearer \${{ secrets.DS_TOKEN }}")
          
          SCAN_ID=$(echo $RESPONSE | jq -r '.id')
          echo "Scan started. ID: $SCAN_ID"
          
          # 2. Poll Status
          STATUS="running"
          while [ "$STATUS" == "running" ] || [ "$STATUS" == "pending" ]; do
            sleep 5
            SCAN_RES=$(curl -s -X GET "\${{ secrets.DS_API_URL }}/projects/\${{ secrets.DS_PROJECT_ID }}/scans/$SCAN_ID" \\
                -H "Authorization: Bearer \${{ secrets.DS_TOKEN }}")
            STATUS=$(echo $SCAN_RES | jq -r '.status')
            echo "Status: $STATUS..."
          done
          
          # 3. Check Results
          SCORE=$(echo $SCAN_RES | jq -r '.score')
          CRITICAL_COUNT=$(echo $SCAN_RES | jq -r '.vulnerabilities | map(select(.severity == "critical")) | length')
          
          echo "Scan finished. Score: $SCORE, Critical Vulns: $CRITICAL_COUNT"
          
          if [ "$STATUS" == "failed" ]; then
            echo "::error::Scan failed internally."
            exit 1
          fi

          if (( $(echo "$SCORE < 80" | bc -l) )); then
             echo "::error::Security Score too low ($SCORE < 80). Failing pipeline."
             exit 1
          fi

          if [ "$CRITICAL_COUNT" -gt "0" ]; then
             echo "::error::Found $CRITICAL_COUNT critical vulnerabilities. Failing pipeline."
             exit 1
          fi
          
          echo "Security Check Passed!"
`);

const copyWorkflow = () => {
  navigator.clipboard.writeText(workflowYaml.value);
  toast.success('Workflow YAML copied to clipboard');
};
</script>
