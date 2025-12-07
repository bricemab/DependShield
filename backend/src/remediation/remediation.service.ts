import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Vulnerability } from '../scans/vulnerability.entity';
import { Project, PackageManager } from '../projects/project.entity';
import { UsersService } from '../users/users.service';
import { GithubService } from '../scans/github.service';

const execAsync = promisify(exec);

@Injectable()
export class RemediationService {
    private readonly logger = new Logger(RemediationService.name);

    constructor(
        @InjectRepository(Vulnerability)
        private vulnerabilityRepository: Repository<Vulnerability>,
        @InjectRepository(Project)
        private projectRepository: Repository<Project>,
        private usersService: UsersService,
        private githubService: GithubService,
        private configService: ConfigService,
    ) { }

    async fixVulnerability(userId: number, projectId: number, vulnerabilityId: number) {
        // 1. Fetch Vulnerability and Project
        const vulnerability = await this.vulnerabilityRepository.findOne({
            where: { id: vulnerabilityId },
            relations: ['scan', 'scan.project', 'scan.project.user'],
        });

        if (!vulnerability) {
            throw new NotFoundException('Vulnerability not found');
        }

        const project = vulnerability.scan.project;
        if (project.id !== projectId) {
            throw new NotFoundException('Project mismatch');
        }
        if (project.user.id !== userId) {
            throw new NotFoundException('Access denied');
        }

        const user = await this.usersService.findOne(userId);
        if (!user || !user.accessToken) {
            throw new Error('User access token missing');
        }

        const packageName = vulnerability.packageName;
        const tempDir = path.join(this.configService.get<string>('scan.tempDir') || './tmp', `fix-${vulnerabilityId}-${Date.now()}`);
        await fs.ensureDir(tempDir);

        try {
            this.logger.log(`Starting remediation for ${packageName} in project ${project.name}`);

            // 2. Fetch package.json and lockfile
            // Assume npm for MVP or detect from project
            const packageManager = project.packageManager || 'npm';
            const lockFilename = this.getLockfilename(packageManager);

            let lockFilePath = lockFilename;
            if (project.lockfilePath && project.lockfilePath !== '.') {
                if (path.extname(project.lockfilePath)) {
                    lockFilePath = project.lockfilePath;
                } else {
                    lockFilePath = path.join(project.lockfilePath, lockFilename).replace(/\\/g, '/');
                }
            }

            // Derive package.json directory from lockfile path to support custom locations
            // path.dirname returns '.' if no dir, so join works correctly relative to root
            const packageJsonPath = path.join(path.dirname(lockFilePath), 'package.json').replace(/\\/g, '/');

            const packageJsonContent = await this.githubService.getFileContent(project.repositoryUrl, packageJsonPath, project.branch, user.accessToken);
            const lockfileContent = await this.githubService.getFileContent(project.repositoryUrl, lockFilePath, project.branch, user.accessToken);

            await fs.writeFile(path.join(tempDir, 'package.json'), packageJsonContent);
            await fs.writeFile(path.join(tempDir, lockFilename), lockfileContent);

            // 3. Run Upgrade
            // MVP: npm install package@latest
            // TODO: Support Yarn/Pnpm
            let command = '';
            if (packageManager === PackageManager.NPM) {
                command = `npm install ${packageName}@latest --package-lock-only`;
                // Using --package-lock-only prevents full install of node_modules, 
                // but updates package-lock.json and package.json.
                // However, without node_modules, sometimes npm install fails if it needs to run scripts.
                // --ignore-scripts might help.
                command += ' --ignore-scripts';
            } else {
                throw new Error(`Auto-fix currently only supports 'npm'. Project is using '${packageManager}'.`);
            }

            this.logger.log(`Running upgrade command: ${command}`);
            await execAsync(command, { cwd: tempDir });

            // 4. Read updated files
            const newPackageJson = await fs.readFile(path.join(tempDir, 'package.json'), 'utf-8');
            const newLockfile = await fs.readFile(path.join(tempDir, lockFilename), 'utf-8');

            // 5. Create Branch and PR
            const branchName = `fix/dependshield-${packageName}-${Date.now()}`;
            const prTitle = `Fix security vulnerability in ${packageName}`;
            const prBody = `This PR automatically upgrades \`${packageName}\` to the latest version to fix a known vulnerability detected by DependShield.\n\n**Vulnerability**: ${vulnerability.title} (${vulnerability.cve || 'No CVE'})`;

            await this.githubService.createBranch(project.repositoryUrl, project.branch, branchName, user.accessToken);

            await this.githubService.pushChanges(
                project.repositoryUrl,
                branchName,
                [
                    { path: packageJsonPath, content: newPackageJson },
                    { path: lockFilePath, content: newLockfile }
                ],
                `fix: upgrade ${packageName} to latest version`,
                user.accessToken
            );

            const prUrl = await this.githubService.createPullRequest(project.repositoryUrl, prTitle, prBody, branchName, project.branch, user.accessToken);

            this.logger.log(`Remediation PR created: ${prUrl}`);
            return { prUrl };

        } catch (error) {
            this.logger.error(`Remediation failed: ${error.message}`);
            throw error;
        } finally {
            await fs.remove(tempDir);
        }
    }

    private getLockfilename(pm: string | PackageManager): string {
        switch (pm) {
            case PackageManager.YARN: return 'yarn.lock';
            case PackageManager.PNPM: return 'pnpm-lock.yaml';
            case PackageManager.BUN: return 'bun.lockb';
            default: return 'package-lock.json';
        }
    }
}
