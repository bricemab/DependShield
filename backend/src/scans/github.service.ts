import { Injectable, Logger } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import axios from 'axios';

@Injectable()
export class GithubService {
    private readonly logger = new Logger(GithubService.name);

    async getFileContent(repoUrl: string, path: string, branch: string, token: string): Promise<string> {
        try {
            const { owner, repo } = this.parseRepoUrl(repoUrl);

            const octokit = new Octokit({ auth: token });

            this.logger.debug(`Fetching file ${path} from ${owner}/${repo} on branch ${branch}`);

            const { data } = await octokit.repos.getContent({
                owner,
                repo,
                path,
                ref: branch,
            });

            if ('content' in data && 'encoding' in data) {
                const encoding = data.encoding as BufferEncoding;
                return Buffer.from(data.content, encoding).toString('utf-8');
            } else {
                throw new Error('File content not found or is a directory');
            }
        } catch (error) {
            this.logger.error(`Failed to fetch file ${path} from ${repoUrl}: ${error.message}`);
            throw error;
        }
    }

    async getCommitSha(repoUrl: string, branch: string, token: string): Promise<string> {
        const { owner, repo } = this.parseRepoUrl(repoUrl);
        const octokit = new Octokit({ auth: token });

        try {
            const { data } = await octokit.repos.getBranch({
                owner,
                repo,
                branch,
            });
            return data.commit.sha;
        } catch (error) {
            this.logger.error(`Failed to get commit SHA for ${owner}/${repo} branch ${branch}: ${error.message}`);
            throw error;
        }
    }

    async updateCommitStatus(
        repoUrl: string,
        sha: string,
        state: 'pending' | 'success' | 'failure' | 'error',
        description: string,
        targetUrl: string,
        token: string
    ): Promise<void> {
        const { owner, repo } = this.parseRepoUrl(repoUrl);
        const octokit = new Octokit({ auth: token });

        try {
            await octokit.repos.createCommitStatus({
                owner,
                repo,
                sha,
                state,
                description,
                target_url: targetUrl, // Needs to be absolute URL to current FE
                context: 'DependShield Security Scan',
            });
            this.logger.log(`Updated commit status for ${sha} to ${state}`);
        } catch (error) {
            this.logger.error(`Failed to update commit status for ${sha}: ${error.message}`);
            // Do not throw, just log. Status update failure shouldn't stop the scan?
        }
    }

    async checkFileExists(repoUrl: string, path: string, branch: string, token: string): Promise<boolean> {
        try {
            await this.getFileContent(repoUrl, path, branch, token);
            return true;
        } catch (error) {
            return false;
        }
    }

    async getRepoTree(repoUrl: string, branch: string, token: string): Promise<any[]> {
        const { owner, repo } = this.parseRepoUrl(repoUrl);
        const octokit = new Octokit({ auth: token });

        try {
            // First get the commit SHA
            const sha = await this.getCommitSha(repoUrl, branch, token);

            // Get the Tree (Recursive)
            const { data } = await octokit.git.getTree({
                owner,
                repo,
                tree_sha: sha,
                recursive: '1',
            });

            return data.tree as any[];
        } catch (error) {
            this.logger.error(`Failed to get repo tree for ${owner}/${repo}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Fetch CVE identifiers from GitHub Security Advisory ID (GHSA)
     * Uses GitHub GraphQL API to get CVE information
     */
    async getCveFromGhsa(ghsaId: string, token?: string): Promise<string | null> {
        try {
            // GitHub GraphQL API query to get CVE from GHSA
            const query = `
                query {
                    securityAdvisory(ghsaId: "${ghsaId}") {
                        identifiers {
                            type
                            value
                        }
                    }
                }
            `;

            const response = await axios.post(
                'https://api.github.com/graphql',
                { query },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : '',
                    },
                    timeout: 5000,
                }
            );

            if (response.data?.data?.securityAdvisory?.identifiers) {
                const identifiers = response.data.data.securityAdvisory.identifiers;
                // Find CVE identifier
                const cveIdentifier = identifiers.find((id: any) => id.type === 'CVE');
                if (cveIdentifier) {
                    this.logger.debug(`Found CVE ${cveIdentifier.value} for GHSA ${ghsaId}`);
                    return cveIdentifier.value;
                }
            }

            this.logger.debug(`No CVE found for GHSA ${ghsaId}`);
            return null;
        } catch (error) {
            this.logger.warn(`Failed to fetch CVE for GHSA ${ghsaId}: ${error.message}`);
            return null;
        }
    }

    /**
     * Batch fetch CVEs from multiple GHSA IDs
     * Returns a map of GHSA ID -> CVE
     */
    async getCvesFromGhsas(ghsaIds: string[], token?: string): Promise<Map<string, string>> {
        const result = new Map<string, string>();

        // Process in parallel but limit concurrency to avoid rate limiting
        const batchSize = 5;
        for (let i = 0; i < ghsaIds.length; i += batchSize) {
            const batch = ghsaIds.slice(i, i + batchSize);
            const promises = batch.map(ghsaId => this.getCveFromGhsa(ghsaId, token));
            const cves = await Promise.all(promises);

            batch.forEach((ghsaId, index) => {
                if (cves[index]) {
                    result.set(ghsaId, cves[index]!);
                }
            });
        }

        return result;
    }

    private parseRepoUrl(repoUrl: string): { owner: string, repo: string } {
        const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
        if (!match) {
            throw new Error('Invalid GitHub URL');
        }
        return { owner: match[1], repo: match[2] };
    }
}
