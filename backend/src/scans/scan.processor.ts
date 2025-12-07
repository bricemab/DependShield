import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Scan, ScanStatus } from './scan.entity';
import { Vulnerability, VulnerabilitySeverity, VulnerabilityType } from './vulnerability.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { WhitelistService } from './whitelist.service';
import { GithubService } from './github.service';
import { UsersService } from '../users/users.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { WebhookEvent } from '../webhooks/webhook.entity';

const execAsync = promisify(exec);

@Processor('scans')
export class ScanProcessor {
    private readonly logger = new Logger(ScanProcessor.name);

    constructor(
        @InjectRepository(Scan)
        private scansRepository: Repository<Scan>,
        @InjectRepository(Vulnerability)
        private vulnerabilitiesRepository: Repository<Vulnerability>,
        private configService: ConfigService,
        private notificationsService: NotificationsService,
        private whitelistService: WhitelistService,
        private githubService: GithubService,
        private usersService: UsersService,
        private webhooksService: WebhooksService,
    ) { }

    @Process('scan')
    async handleScan(job: Job<{ scanId: number }>) {
        const { scanId } = job.data;
        this.logger.log(`Processing scan ${scanId}...`);

        const scan = await this.scansRepository.findOne({
            where: { id: scanId },
            relations: ['project', 'project.user'],
        });

        if (!scan) {
            this.logger.error(`Scan ${scanId} not found`);
            return;
        }

        try {
            // Update status to running
            scan.status = ScanStatus.RUNNING;
            await this.scansRepository.save(scan);

            const tempDir = this.configService.get<string>('scan.tempDir');
            const scanDir = path.join(tempDir, `scan-${scanId}`);

            // Ensure temp directory exists
            await fs.ensureDir(scanDir);

            this.logger.log(`Fetching lockfile via GitHub API for scan ${scanId}...`);

            // Get user with access token
            const user = await this.usersService.findOne(scan.project.user.id);
            if (!user || !user.accessToken) {
                throw new Error('User access token not found');
            }

            // Fetch commit SHA for the branch and update status to PENDING
            try {
                const commitSha = await this.githubService.getCommitSha(
                    scan.project.repositoryUrl,
                    scan.project.branch,
                    user.accessToken
                );
                scan.commitSha = commitSha;
                await this.scansRepository.save(scan);

                // Update GitHub status to PENDING
                await this.githubService.updateCommitStatus(
                    scan.project.repositoryUrl,
                    commitSha,
                    'pending',
                    'Scan in progress...',
                    `http://localhost:5173/scans/${scan.id}`, // TODO: Use real env config
                    user.accessToken
                );
            } catch (statusError) {
                this.logger.warn(`Failed to update GitHub status: ${statusError.message}`);
                // Continue scanning even if status check fails
            }

            // Determine lockfile path (default to package-lock.json if not specified)
            const lockFilename = this.getLockfilename(scan.project.packageManager);
            let targetPath = lockFilename;

            if (scan.project.lockfilePath && scan.project.lockfilePath !== '.') {
                if (path.extname(scan.project.lockfilePath)) {
                    targetPath = scan.project.lockfilePath;
                } else {
                    targetPath = path.join(scan.project.lockfilePath, lockFilename).replace(/\\/g, '/');
                }
            }

            // Fetch lockfile content
            const lockfileContent = await this.githubService.getFileContent(
                scan.project.repositoryUrl,
                targetPath,
                scan.project.branch,
                user.accessToken
            );

            const savedLockfilename = path.basename(targetPath);
            await fs.writeFile(path.join(scanDir, savedLockfilename), lockfileContent);
            this.logger.log(`Lockfile ${savedLockfilename} fetched and saved to ${scanDir}`);

            // Also fetch package.json just in case
            try {
                const packageJsonPath = targetPath.replace(savedLockfilename, 'package.json');
                const packageJsonContent = await this.githubService.getFileContent(
                    scan.project.repositoryUrl,
                    packageJsonPath,
                    scan.project.branch,
                    user.accessToken
                );
                await fs.writeFile(path.join(scanDir, 'package.json'), packageJsonContent);
            } catch (e) {
                this.logger.warn(`Could not fetch package.json, continuing without it: ${e.message}`);
            }

            this.logger.log(`Running vulnerability scan for scan ${scanId}...`);

            // Run full audit
            const fullAuditResult = await this.runAudit(scanDir, scan.project.packageManager, false);
            const fullVulnerabilities = this.parseAuditResult(fullAuditResult, scan.project.packageManager);

            // Run production-only audit
            const prodAuditResult = await this.runAudit(scanDir, scan.project.packageManager, true);
            const prodVulnerabilities = this.parseAuditResult(prodAuditResult, scan.project.packageManager);

            // Map prod vulnerabilities
            const prodVulnSet = new Set<string>();
            prodVulnerabilities.forEach(v => {
                prodVulnSet.add(`${v.packageName}:${v.version}:${v.cve || v.title}`);
            });

            const vulnerabilities: Partial<Vulnerability>[] = fullVulnerabilities.map(v => {
                const key = `${v.packageName}:${v.version}:${v.cve || v.title}`;
                const isDevDependency = !prodVulnSet.has(key);
                return { ...v, isDevDependency, type: VulnerabilityType.DEPENDENCY };
            });

            // Run Docker Scan
            const dockerVulns = await this.scanDocker(scan.project.repositoryUrl, scan.project.branch, user.accessToken);
            vulnerabilities.push(...dockerVulns);

            // Run Secret Scan
            const secretVulns = await this.scanSecrets(scan.project.repositoryUrl, scan.project.branch, user.accessToken);
            vulnerabilities.push(...secretVulns);

            // Fetch whitelist rules
            const whitelistRules = await this.whitelistService.findAllByProject(scan.project.id);

            for (const vuln of vulnerabilities) {
                const isWhitelisted = whitelistRules.some(rule => {
                    if (rule.packageName !== vuln.packageName) return false;
                    if (rule.cve && rule.cve !== vuln.cve) return false;
                    return true;
                });

                const vulnerability = this.vulnerabilitiesRepository.create({
                    ...vuln,
                    scanId: scan.id,
                    whitelisted: isWhitelisted,
                });
                await this.vulnerabilitiesRepository.save(vulnerability);
            }

            // Calculate score
            const activeVulnerabilities = await this.vulnerabilitiesRepository.find({
                where: { scanId: scan.id, whitelisted: false }
            });
            const score = this.calculateScore(activeVulnerabilities);

            // Update scan
            scan.status = ScanStatus.COMPLETED;
            scan.vulnerabilitiesCount = activeVulnerabilities.length;
            scan.score = score;
            scan.completedAt = new Date();
            await this.scansRepository.save(scan);

            // Email Notification
            if (scan.project.emailEnabled && scan.project.user.email) {
                await this.notificationsService.sendScanResultEmail(scan.project.user.email, scan);
            }

            // Webhooks Notification (Success)
            await this.webhooksService.triggerWebhook(scan.project, scan, WebhookEvent.SCAN_COMPLETED);

            // GitHub Status
            if (scan.commitSha) {
                const statusState = activeVulnerabilities.length > 0 ? 'failure' : 'success';
                const description = activeVulnerabilities.length > 0
                    ? `Found ${activeVulnerabilities.length} vulnerabilities`
                    : 'No vulnerabilities found';

                await this.githubService.updateCommitStatus(
                    scan.project.repositoryUrl,
                    scan.commitSha,
                    statusState,
                    description,
                    `http://localhost:5173/scans/${scan.id}`,
                    user.accessToken
                );
            }

            this.logger.log(`Scan ${scanId} completed successfully`);
        } catch (error) {
            this.logger.error(`Scan ${scanId} failed:`, error);
            scan.status = ScanStatus.FAILED;
            scan.errorMessage = error.message;
            scan.completedAt = new Date();
            await this.scansRepository.save(scan);

            // Webhooks Notification (Failure)
            await this.webhooksService.triggerWebhook(scan.project, scan, WebhookEvent.SCAN_FAILED);

            // Update GitHub Status to ERROR
            if (scan.commitSha) {
                try {
                    const userForError = await this.usersService.findOne(scan.project.user.id);
                    if (userForError && userForError.accessToken) {
                        await this.githubService.updateCommitStatus(
                            scan.project.repositoryUrl,
                            scan.commitSha,
                            'error',
                            `Scan failed: ${error.message}`,
                            `http://localhost:5173/scans/${scan.id}`,
                            userForError.accessToken
                        );
                    }
                } catch (e) {
                    this.logger.warn(`Failed to update GitHub status on error: ${e.message}`);
                }
            }
        } finally {
            // Cleanup
            const tempDir = this.configService.get<string>('scan.tempDir');
            const scanDir = path.join(tempDir, `scan-${scanId}`);
            try {
                if (await fs.pathExists(scanDir)) {
                    await fs.remove(scanDir);
                    this.logger.log(`Cleaned up directory for scan ${scanId}`);
                }
            } catch (cleanupError) {
                this.logger.error(`Failed to cleanup scan directory for scan ${scanId}`, cleanupError);
            }
        }
    }

    private getLockfilename(pm: string): string {
        if (pm === 'yarn') return 'yarn.lock';
        if (pm === 'pnpm') return 'pnpm-lock.yaml';
        if (pm === 'bun') return 'bun.lockb';
        return 'package-lock.json';
    }

    private async runAudit(dir: string, packageManager: string, prodOnly: boolean = false): Promise<string> {
        let command: string;
        const prodFlag = prodOnly ? (packageManager === 'pnpm' ? '--prod' : '--only=prod') : '';

        switch (packageManager) {
            case 'npm':
                command = `npm audit --json ${prodFlag}`;
                break;
            case 'yarn':
                command = 'yarn audit --json';
                if (prodOnly) {
                    this.logger.warn('Yarn audit does not support production-only filtering reliably via JSON.');
                }
                break;
            case 'pnpm':
                command = `pnpm audit --json ${prodFlag}`;
                break;
            case 'bun':
                command = 'bun audit --json';
                break;
            default:
                command = `npm audit --json ${prodFlag}`;
        }

        try {
            let cwd = dir;
            if (fs.existsSync(dir) && fs.lstatSync(dir).isFile()) {
                cwd = path.dirname(dir);
            }

            const { stdout } = await execAsync(command, {
                cwd,
                timeout: 60000,
                maxBuffer: 50 * 1024 * 1024
            });
            return stdout;
        } catch (error) {
            if (error.stdout) {
                return error.stdout;
            }
            this.logger.error(`Audit command failed: ${error.message}`);
            return '{}';
        }
    }

    private parseAuditResult(auditOutput: string, packageManager: string): Partial<Vulnerability>[] {
        try {
            const result = JSON.parse(auditOutput);
            const vulnerabilities: Partial<Vulnerability>[] = [];

            if (packageManager === 'npm') {
                const advisories = result.vulnerabilities || {};
                for (const [packageName, data] of Object.entries(advisories as any)) {
                    const vulnData = data as any;
                    vulnerabilities.push({
                        packageName,
                        version: vulnData.range || 'unknown',
                        severity: this.mapSeverity(vulnData.severity),
                        title: vulnData.title || 'Vulnerability found',
                        description: vulnData.overview || '',
                        cve: vulnData.cves?.[0] || null,
                        url: vulnData.url || null,
                    });
                }
            }
            return vulnerabilities;
        } catch (error) {
            this.logger.error('Failed to parse audit result:', error);
            return [];
        }
    }

    private mapSeverity(severity: string): VulnerabilitySeverity {
        switch (severity?.toLowerCase()) {
            case 'critical': return VulnerabilitySeverity.CRITICAL;
            case 'high': return VulnerabilitySeverity.HIGH;
            case 'moderate': case 'medium': return VulnerabilitySeverity.MODERATE;
            case 'low': default: return VulnerabilitySeverity.LOW;
        }
    }

    private calculateScore(vulnerabilities: Partial<Vulnerability>[]): number {
        if (vulnerabilities.length === 0) return 100;
        let totalWeight = 0;
        for (const vuln of vulnerabilities) {
            const sev = vuln.severity;
            if (sev === VulnerabilitySeverity.CRITICAL) totalWeight += 10;
            else if (sev === VulnerabilitySeverity.HIGH) totalWeight += 5;
            else if (sev === VulnerabilitySeverity.MODERATE) totalWeight += 2;
            else if (sev === VulnerabilitySeverity.LOW) totalWeight += 1;
        }
        return Math.min(100, Math.max(0, 100 - totalWeight));
    }

    private async scanDocker(repoUrl: string, branch: string, token: string): Promise<Partial<Vulnerability>[]> {
        const vulns: Partial<Vulnerability>[] = [];
        try {
            const dockerfileContent = await this.githubService.getFileContent(repoUrl, 'Dockerfile', branch, token);

            if (/FROM\s+[\w\-\/\.]+(:latest)?\s+/i.test(dockerfileContent) || !/FROM\s+[\w\-\/\.]+:/i.test(dockerfileContent)) {
                if (/FROM\s+[\w\-\/\.]+:latest/i.test(dockerfileContent) || /FROM\s+[\w\-\/\.]+\s+$/m.test(dockerfileContent)) {
                    vulns.push({
                        packageName: 'Dockerfile',
                        version: 'current',
                        severity: VulnerabilitySeverity.MODERATE,
                        title: 'Docker Image uses "latest" tag',
                        description: 'Using the "latest" tag leads to non-reproducible builds and potential breakage.',
                        type: VulnerabilityType.DOCKER,
                        isDevDependency: false
                    });
                }
            }

            if (!/USER\s+\w+/i.test(dockerfileContent)) {
                vulns.push({
                    packageName: 'Dockerfile',
                    version: 'current',
                    severity: VulnerabilitySeverity.MODERATE,
                    title: 'Container runs as root',
                    description: 'No USER instruction found. Running as root is a security risk.',
                    type: VulnerabilityType.DOCKER,
                    isDevDependency: false
                });
            }

            if (/ADD\s+/i.test(dockerfileContent)) {
                vulns.push({
                    packageName: 'Dockerfile',
                    version: 'current',
                    severity: VulnerabilitySeverity.LOW,
                    title: 'Use COPY instead of ADD',
                    description: 'ADD has features (remote URL fetching, tar extraction) that can be dangerous. Use COPY for local files.',
                    type: VulnerabilityType.DOCKER,
                    isDevDependency: false
                });
            }
        } catch (e) {
            this.logger.log(`No Dockerfile found or could not be scanned: ${e.message}`);
        }
        return vulns;
    }

    private async scanSecrets(repoUrl: string, branch: string, token: string): Promise<Partial<Vulnerability>[]> {
        const vulns: Partial<Vulnerability>[] = [];

        this.logger.log(`[SecretScan] Checking for secrets in ${repoUrl} on branch ${branch}...`);

        const hasEnv = await this.githubService.checkFileExists(repoUrl, '.env', branch, token);
        this.logger.log(`[SecretScan] .env detection result: ${hasEnv}`);

        if (hasEnv) {
            vulns.push({
                packageName: 'Secret Leak',
                version: 'N/A',
                severity: VulnerabilitySeverity.CRITICAL,
                title: '.env file committed to repository',
                description: 'The .env file may contain sensitive production secrets. Remove it from git immediately.',
                type: VulnerabilityType.SECRET,
                isDevDependency: false
            });
        }

        return vulns;
    }
}
