<template>
  <div class="inline-flex items-center gap-1">
    <span 
      :class="['inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border', badgeClasses]"
      :title="tooltipText"
    >
      {{ formattedScore }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

interface Props {
  score: number;        // 0.0 to 1.0
  percentile: number;   // 0.0 to 1.0
}

const props = defineProps<Props>();
const { t } = useI18n();

const badgeClasses = computed(() => {
  if (props.score >= 0.5) return 'bg-red-500/10 text-red-500 border-red-500/20';      // Red - Very High Risk
  if (props.score >= 0.1) return 'bg-orange-500/10 text-orange-500 border-orange-500/20';  // Orange - High Risk
  if (props.score >= 0.01) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'; // Yellow - Medium Risk
  return 'bg-green-500/10 text-green-500 border-green-500/20';                        // Green - Low Risk
});

const formattedScore = computed(() => {
  return `${(props.score * 100).toFixed(1)}%`;
});

const tooltipText = computed(() => {
  return t('scan_detail.epss_tooltip', { 
    score: (props.score * 100).toFixed(2), 
    percentile: (props.percentile * 100).toFixed(1) 
  });
});
</script>

