import { Injectable, ForbiddenException } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import {
  GitProvider,
  GitRepository,
  GitBranch,
  GitLockfile,
} from '../interfaces/git-provider.interface';

@Injectable()
export class GithubProvider implements GitProvider {
  async getRepositories(accessToken: string): Promise<GitRepository[]> {
    if (!accessToken) {
      throw new ForbiddenException('GitHub access token not found');
    }

    const octokit = new Octokit({ auth: accessToken });
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
    });

    return data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      private: repo.private,
    }));
  }

  async getRepositoryMetadata(
    accessToken: string,
    owner: string,
    repo: string,
  ): Promise<{ private: boolean }> {
    if (!accessToken) {
      throw new ForbiddenException('GitHub access token not found');
    }

    const octokit = new Octokit({ auth: accessToken });
    const { data } = await octokit.repos.get({ owner, repo });
    return { private: data.private };
  }

  async getBranches(
    accessToken: string,
    owner: string,
    repo: string,
  ): Promise<GitBranch[]> {
    if (!accessToken) {
      throw new ForbiddenException('GitHub access token not found');
    }

    const octokit = new Octokit({ auth: accessToken });
    const { data } = await octokit.repos.listBranches({ owner, repo });

    return data.map((branch) => ({
      name: branch.name,
      protected: branch.protected,
    }));
  }

  async detectLockfiles(
    accessToken: string,
    owner: string,
    repo: string,
    branch: string,
  ): Promise<GitLockfile[]> {
    if (!accessToken) {
      throw new ForbiddenException('GitHub access token not found');
    }

    const octokit = new Octokit({ auth: accessToken });
    const lockfiles: GitLockfile[] = [];

    try {
      // Get the recursive tree
      const { data } = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: branch,
        recursive: 'true',
      });

      const lockfileNames = {
        'package-lock.json': 'npm',
        'yarn.lock': 'yarn',
        'pnpm-lock.yaml': 'pnpm',
        'bun.lockb': 'bun',
      };

      for (const item of data.tree) {
        if (item.type === 'blob' && item.path) {
          const fileName = item.path.split('/').pop();
          if (fileName && fileName in lockfileNames) {
            lockfiles.push({
              path: item.path,
              packageManager:
                lockfileNames[fileName as keyof typeof lockfileNames],
            });
          }
        }
      }
    } catch (error) {
      console.error('Error detecting lockfiles:', error);
    }

    return lockfiles;
  }
}
