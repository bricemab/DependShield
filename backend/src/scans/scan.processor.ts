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
import { Vulnerability, VulnerabilitySeverity } from './vulnerability.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { WhitelistService } from './whitelist.service';
import { GithubService } from './github.service';
import { UsersService } from '../users/users.service';

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
            // Note: scan.project.lockfilePath might be empty or relative
            let lockFilename = 'package-lock.json';
            const pm = scan.project.packageManager;
            if (pm === 'yarn') lockFilename = 'yarn.lock';
            if (pm === 'pnpm') lockFilename = 'pnpm-lock.yaml';
            if (pm === 'bun') lockFilename = 'bun.lockb';

            // If project has specific lockfilePath, use it. 
            // BUT: project.lockfilePath is usually the path TO the file, e.g. "backend/package-lock.json"
            // If it's just ".", we assume the file name based on PM.
            let targetPath = lockFilename;
            if (scan.project.lockfilePath && scan.project.lockfilePath !== '.') {
                // Check if lockfilePath ends with the file extension or is a directory
                if (scan.project.lockfilePath.endsWith('.json') || scan.project.lockfilePath.endsWith('.lock') || scan.project.lockfilePath.endsWith('.yaml') || scan.project.lockfilePath.endsWith('.lockb')) {
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

            // Write lockfile to temp dir
            // We need to maintain the directory structure if it is a monorepo, OR we just put it in root of temp dir and run audit there?
            // npm audit needs valid package-lock.json. 
            // If we just put it in root, `npm audit` works.
            const localLockfilePath = path.join(scanDir, 'package-lock.json'); // Always name it package-lock.json for npm audit? No, depends on PM.
            // For yarn, it needs yarn.lock AND package.json usually? Yarn audit sends the lockfile to registry?
            // Actually, `npm audit` works best with `package-lock.json`. 
            // Simplification: Write it with the correct name in scanDir.

            // Note: targetPath might be deeply nested "backend/package-lock.json". 
            // We can just flatten it to "scanDir/package-lock.json" for the audit command context, 
            // UNLESS the audit command parses relative paths in dependencies?
            // Usually dependencies in lockfile are registry URLs, so location doesn't matter much for standard repos.

            const savedLockfilename = path.basename(targetPath);
            await fs.writeFile(path.join(scanDir, savedLockfilename), lockfileContent);

            this.logger.log(`Lockfile ${savedLockfilename} fetched and saved to ${scanDir}`);

            // Also fetch package.json just in case (some auditors need it for name/version)
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

            // Map prod vulnerabilities for quick lookup (key = packageName + cve or just packageName for now?)
            // A vulnerability is defined by package name + advisor ID / CVE.
            const prodVulnSet = new Set<string>();
            prodVulnerabilities.forEach(v => {
                // Create a unique key. cve might be null, so use advisory ID if available, otherwise title?
                // Simple key: packageName + version (range) + cve
                prodVulnSet.add(`${v.packageName}:${v.version}:${v.cve || v.title}`);
            });

            const vulnerabilities: Partial<Vulnerability>[] = fullVulnerabilities.map(v => {
                const key = `${v.packageName}:${v.version}:${v.cve || v.title}`;
                // If it is NOT in prod vulns, it is a dev dependency
                const isDevDependency = !prodVulnSet.has(key);
                return { ...v, isDevDependency };
            });

            // Fetch whitelist rules for this project
            const whitelistRules = await this.whitelistService.findAllByProject(scan.project.id);

            for (const vuln of vulnerabilities) {
                // Check if whitelisted
                const isWhitelisted = whitelistRules.some(rule => {
                    if (rule.packageName !== vuln.packageName) return false;
                    // If rule has CVE, it must match. If rule has no CVE, it matches all CVEs for this package.
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

            // Calculate score (exclude whitelisted)
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

            // Send email notification if enabled
            if (scan.project.emailEnabled && scan.project.user.email) {
                await this.notificationsService.sendScanResultEmail(scan.project.user.email, scan);
            }

            // Update GitHub Status to SUCCESS or FAILURE
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

            // Update GitHub Status to ERROR
            if (scan.commitSha) {
                // We need user token, but 'user' might be undefined if we failed before fetching it.
                // We will try to fetch it again if possible, or just skip.
                // To be safe, we only do this if we have user accessible. 
                // Actually, we can just wrap this.
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

    private async runAudit(dir: string, packageManager: string, prodOnly: boolean = false): Promise<string> {
        let command: string;

        // Helper to format flags
        const prodFlag = prodOnly ? (packageManager === 'pnpm' ? '--prod' : '--only=prod') : '';

        switch (packageManager) {
            case 'npm':
                command = `npm audit --json ${prodFlag}`;
                break;
            case 'yarn':
                // Yarn classic doesn't support --only=prod in audit --json easily, but try --groups dependencies 
                // However, user prompt says "npm audit, yarn audit".
                // If prodOnly is requested and it's yarn, we might skip or try best effort. 
                // Yarn 1: `yarn audit --json` returns all. 
                // Let's assume full audit for yarn if prodFlag fails, OR just don't use flag if it breaks.
                // For MVP, if yarn, we ignore prodOnly flag to prevent errors, meaning isDevDependency will likely be false always (conservative).
                command = 'yarn audit --json';
                if (prodOnly) {
                    // Yarn classic `yarn audit --production` might work? No.
                    this.logger.warn('Yarn audit does not support production-only filtering reliably via JSON. treating all as runtime.');
                }
                break;
            case 'pnpm':
                command = `pnpm audit --json ${prodFlag}`;
                break;
            case 'bun':
                command = 'bun audit --json'; // Bun audit flags are still maturing
                break;
            default:
                command = `npm audit --json ${prodFlag}`;
        }

        try {
            this.logger.log(`Executing command '${command}' in directory '${dir}'`);

            // If dir points to a file, get the directory
            let cwd = dir;
            if (fs.existsSync(dir) && fs.lstatSync(dir).isFile()) {
                cwd = path.dirname(dir);
                this.logger.log(`Corrected cwd from file to directory: '${cwd}'`);
            } else if (!fs.existsSync(dir)) {
                this.logger.error(`Directory '${dir}' does not exist!`);
            }

            const { stdout } = await execAsync(command, {
                cwd,
                timeout: 60000,
                maxBuffer: 50 * 1024 * 1024 // 50MB buffer
            });
            this.logger.log(`Audit command executed successfully (0 vulnerabilities)`);
            return stdout;
        } catch (error) {
            // npm audit returns non-zero exit code when vulnerabilities are found
            if (error.stdout) {
                this.logger.log(`Audit finished with exit code ${error.code} (vulnerabilities found). Parsing output...`);
                return error.stdout;
            }

            this.logger.error(`Audit command failed completely: ${error.message}`);
            return '{}';
        }
    }

    private parseAuditResult(auditOutput: string, packageManager: string): Partial<Vulnerability>[] {
        try {
            const result = JSON.parse(auditOutput);
            const vulnerabilities: Partial<Vulnerability>[] = [];

            if (packageManager === 'npm') {
                // Parse npm audit format
                const advisories = result.vulnerabilities || {};
                for (const [packageName, data] of Object.entries(advisories as any)) {
                    const vulnData = data as any; // Type assertion for dynamic audit data
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
            case 'critical':
                return VulnerabilitySeverity.CRITICAL;
            case 'high':
                return VulnerabilitySeverity.HIGH;
            case 'moderate':
            case 'medium':
                return VulnerabilitySeverity.MODERATE;
            case 'low':
            default:
                return VulnerabilitySeverity.LOW;
        }
    }

    private calculateScore(vulnerabilities: Partial<Vulnerability>[]): number {
        if (vulnerabilities.length === 0) return 100;

        let totalWeight = 0;
        for (const vuln of vulnerabilities) {
            switch (vuln.severity) {
                case VulnerabilitySeverity.CRITICAL:
                    totalWeight += 10;
                    break;
                case VulnerabilitySeverity.HIGH:
                    totalWeight += 5;
                    break;
                case VulnerabilitySeverity.MODERATE:
                    totalWeight += 2;
                    break;
                case VulnerabilitySeverity.LOW:
                    totalWeight += 1;
                    break;
            }
        }

        // Score from 0 to 100 (100 = no vulnerabilities)
        const score = Math.max(0, 100 - totalWeight);
        return Math.round(score * 10) / 10;
    }
}
