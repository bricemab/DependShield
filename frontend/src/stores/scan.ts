import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import { useAuthStore } from './auth';

const API_URL = 'http://localhost:3000';

interface Scan {
    id: number;
    projectId: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    vulnerabilitiesCount: number;
    score: number;
    errorMessage?: string;
    startedAt: string;
    completedAt?: string;
}

interface Vulnerability {
    id: number;
    packageName: string;
    version: string;
    severity: 'low' | 'moderate' | 'high' | 'critical';
    title: string;
    description: string;
    cve?: string;
    url?: string;
    whitelisted: boolean;
}

export const useScanStore = defineStore('scan', () => {
    const authStore = useAuthStore();
    const scans = ref<Scan[]>([]);
    const currentScan = ref<Scan | null>(null);
    const vulnerabilities = ref<Vulnerability[]>([]);
    const loading = ref(false);

    const getHeaders = () => ({
        headers: { Authorization: `Bearer ${authStore.token}` },
    });

    async function triggerScan(projectId: number) {
        loading.value = true;
        try {
            const response = await axios.post(`${API_URL}/scans/trigger/${projectId}`, {}, getHeaders());
            return response.data;
        } catch (error) {
            console.error('Failed to trigger scan', error);
            throw error;
        } finally {
            loading.value = false;
        }
    }

    async function fetchScans(projectId: number) {
        loading.value = true;
        try {
            const response = await axios.get(`${API_URL}/scans/project/${projectId}`, getHeaders());
            scans.value = response.data;
        } catch (error) {
            console.error('Failed to fetch scans', error);
        } finally {
            loading.value = false;
        }
    }

    async function fetchScanDetails(scanId: number) {
        loading.value = true;
        try {
            const response = await axios.get(`${API_URL}/scans/${scanId}`, getHeaders());
            currentScan.value = response.data;
            vulnerabilities.value = response.data.vulnerabilities || [];
        } catch (error) {
            console.error('Failed to fetch scan details', error);
        } finally {
            loading.value = false;
        }
    }

    return {
        scans,
        currentScan,
        vulnerabilities,
        loading,
        triggerScan,
        fetchScans,
        fetchScanDetails,
    };
});
