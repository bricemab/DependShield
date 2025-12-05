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

    const pagination = ref({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });

    async function fetchScans(projectId: number, background = false, page = 1, limit = 10) {
        if (!background) loading.value = true;
        try {
            const response = await axios.get(`${API_URL}/scans/project/${projectId}`, {
                ...getHeaders(),
                params: { page, limit },
            });
            scans.value = response.data.data;
            pagination.value = {
                page: response.data.page,
                limit: response.data.limit,
                total: response.data.total,
                totalPages: response.data.totalPages,
            };
        } catch (error) {
            console.error('Failed to fetch scans', error);
        } finally {
            if (!background) loading.value = false;
        }
    }

    async function fetchScanDetails(scanId: number, background = false) {
        if (!background) loading.value = true;
        try {
            const response = await axios.get(`${API_URL}/scans/${scanId}`, getHeaders());
            currentScan.value = response.data;
            vulnerabilities.value = response.data.vulnerabilities || [];
        } catch (error) {
            console.error('Failed to fetch scan details', error);
        } finally {
            if (!background) loading.value = false;
        }
    }

    async function ignoreVulnerability(projectId: number, vulnerability: any, reason?: string) {
        try {
            await axios.post(`${API_URL}/projects/${projectId}/whitelist`, {
                packageName: vulnerability.packageName,
                cve: vulnerability.cve,
                title: vulnerability.title,
                reason,
            }, getHeaders());
            // Update local state
            const index = vulnerabilities.value.findIndex(v => v.id === vulnerability.id);
            if (index !== -1) {
                vulnerabilities.value[index].whitelisted = true;
            }
        } catch (error) {
            console.error('Failed to ignore vulnerability', error);
            throw error;
        }
    }

    async function unignoreVulnerability(projectId: number, vulnerability: any) {
        try {
            const rulesResponse = await axios.get(`${API_URL}/projects/${projectId}/whitelist`, getHeaders());
            const rules = rulesResponse.data;
            const rule = rules.find((r: any) =>
                r.packageName === vulnerability.packageName &&
                (r.cve === vulnerability.cve || (!r.cve && !vulnerability.cve))
            );

            if (rule) {
                await axios.delete(`${API_URL}/projects/${projectId}/whitelist/${rule.id}`, getHeaders());
                // Update local state
                const index = vulnerabilities.value.findIndex(v => v.id === vulnerability.id);
                if (index !== -1) {
                    vulnerabilities.value[index].whitelisted = false;
                }
            }
        } catch (error) {
            console.error('Failed to unignore vulnerability', error);
            throw error;
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
        ignoreVulnerability,
        unignoreVulnerability,
        pagination,
    };
});
