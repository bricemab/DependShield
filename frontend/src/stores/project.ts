import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../lib/axios';
import { useAuthStore } from './auth';

const API_URL = 'http://localhost:3000';

interface Project {
    id: number;
    name: string;
    repositoryUrl: string;
    repositoryName: string;
    branch: string;
    packageManager: string;
    cronSchedule?: string;
    emailEnabled: boolean;
    immediateScansEnabled: boolean;
    createdAt: string;
    updatedAt: string;
}

interface Repository {
    id: number;
    name: string;
    fullName: string;
    url: string;
    private: boolean;
}

interface Branch {
    name: string;
    protected: boolean;
}

export const useProjectStore = defineStore('project', () => {
    const authStore = useAuthStore();
    const projects = ref<Project[]>([]);
    const repositories = ref<Repository[]>([]);
    const branches = ref<Branch[]>([]);
    const loading = ref(false);

    async function fetchProjects() {
        loading.value = true;
        try {
            const response = await api.get(`${API_URL}/projects`);
            projects.value = response.data;
        } catch (error) {
            console.error('Failed to fetch projects', error);
        } finally {
            loading.value = false;
        }
    }

    async function createProject(projectData: any) {
        loading.value = true;
        try {
            const response = await api.post(`${API_URL}/projects`, projectData);
            projects.value.push(response.data);
            return response.data;
        } catch (error) {
            console.error('Failed to create project', error);
            throw error;
        } finally {
            loading.value = false;
        }
    }

    async function deleteProject(id: number) {
        loading.value = true;
        try {
            await api.delete(`${API_URL}/projects/${id}`);
            projects.value = projects.value.filter((p) => p.id !== id);
        } catch (error) {
            console.error('Failed to delete project', error);
            throw error;
        } finally {
            loading.value = false;
        }
    }

    async function updateProject(id: number, projectData: any) {
        loading.value = true;
        try {
            const response = await api.patch(`${API_URL}/projects/${id}`, projectData);
            const index = projects.value.findIndex((p) => p.id === id);
            if (index !== -1) {
                projects.value[index] = response.data;
            }
            return response.data;
        } catch (error) {
            console.error('Failed to update project', error);
            throw error;
        } finally {
            loading.value = false;
        }
    }

    async function fetchRepositories() {
        loading.value = true;
        try {
            const response = await api.get(`${API_URL}/projects/github/repositories`);
            repositories.value = response.data;
        } catch (error) {
            console.error('Failed to fetch repositories', error);
            throw error;
        } finally {
            loading.value = false;
        }
    }

    async function fetchBranches(owner: string, repo: string) {
        loading.value = true;
        try {
            const response = await api.get(`${API_URL}/projects/github/repositories/${owner}/${repo}/branches`);
            branches.value = response.data;
        } catch (error) {
            console.error('Failed to fetch branches', error);
            throw error;
        } finally {
            loading.value = false;
        }
    }

    async function detectLockfile(owner: string, repo: string, branch: string): Promise<string | null> {
        try {
            const response = await api.get(`${API_URL}/projects/github/detect-lockfile`, {
                params: { owner, repo, branch },
            });
            return response.data;
        } catch (error) {
            console.error('Failed to detect lockfile', error);
            return null;
        }
    }

    return {
        projects,
        repositories,
        branches,
        loading,
        fetchProjects,
        createProject,
        deleteProject,
        fetchRepositories,
        fetchBranches,
        detectLockfile,
        updateProject,
    };
});
