import { Injectable, Logger } from '@nestjs/common';
import { Octokit } from '@octokit/rest';

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

    private parseRepoUrl(repoUrl: string): { owner: string, repo: string } {
        const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
        if (!match) {
            throw new Error('Invalid GitHub URL');
        }
        return { owner: match[1], repo: match[2] };
    }
}
