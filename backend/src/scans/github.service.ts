import { Injectable, Logger } from '@nestjs/common';
import { Octokit } from '@octokit/rest';

@Injectable()
export class GithubService {
    private readonly logger = new Logger(GithubService.name);

    async getFileContent(repoUrl: string, path: string, branch: string, token: string): Promise<string> {
        try {
            // Extract owner and repo from URL (e.g., https://github.com/owner/repo.git)
            const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
            if (!match) {
                throw new Error('Invalid GitHub URL');
            }
            const owner = match[1];
            const repo = match[2];

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
}
