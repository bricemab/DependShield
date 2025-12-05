export interface GitRepository {
    id: string | number;
    name: string;
    fullName: string;
    url: string;
    private: boolean;
}

export interface GitBranch {
    name: string;
    protected: boolean;
}

export interface GitLockfile {
    path: string;
    packageManager: string;
}

export interface GitProvider {
    getRepositories(accessToken: string): Promise<GitRepository[]>;
    getBranches(accessToken: string, owner: string, repo: string): Promise<GitBranch[]>;
    detectLockfiles(accessToken: string, owner: string, repo: string, branch: string): Promise<GitLockfile[]>;
    getRepositoryMetadata(accessToken: string, owner: string, repo: string): Promise<{ private: boolean }>;
}
