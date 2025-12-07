import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import { useAuthStore } from './auth';

const API_URL = 'http://localhost:3000';

export interface DashboardStats {
    totalProjects: number;
    averageScore: number;
    vulnerabilities: {
        critical: number;
        high: number;
        moderate: number;
        low: number;
    };
    riskyProjects: Array<{
        id: number;
        name: string;
        repositoryName: string;
        score: number;
        lastScanDate: string;
        vulnerabilitiesCount: number;
        criticalCount: number;
        highCount: number;
    }>;
    recentScans: Array<{
        id: number;
        number?: number;
        projectId: number;
        projectName: string;
        status: string;
        score: number;
        startedAt: string;
        vulnerabilitiesCount: number;
    }>;
}

export const useDashboardStore = defineStore('dashboard', () => {
    const stats = ref<DashboardStats | null>(null);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const fetchStats = async () => {
        isLoading.value = true;
        error.value = null;
        try {
            const authStore = useAuthStore();
            const response = await axios.get(`${API_URL}/dashboard/stats`, {
                headers: { Authorization: `Bearer ${authStore.token}` }
            });
            stats.value = response.data;
        } catch (e: any) {
            console.error('Failed to fetch dashboard stats:', e);
            error.value = e.response?.data?.message || 'Failed to load dashboard statistics';
        } finally {
            isLoading.value = false;
        }
    };

    return {
        stats,
        isLoading,
        error,
        fetchStats
    };
});
