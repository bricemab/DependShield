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

            // Run audit
            const auditResult = await this.runAudit(scanDir, scan.project.packageManager);

            // Parse and store vulnerabilities
            const vulnerabilities = this.parseAuditResult(auditResult, scan.project.packageManager);

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

            this.logger.log(`Scan ${scanId} completed successfully`);
        } catch (error) {
            this.logger.error(`Scan ${scanId} failed:`, error);
            scan.status = ScanStatus.FAILED;
            scan.errorMessage = error.message;
            scan.completedAt = new Date();
            await this.scansRepository.save(scan);
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

    private async runAudit(dir: string, packageManager: string): Promise<string> {
        let command: string;

        switch (packageManager) {
            case 'npm':
                command = 'npm audit --json';
                break;
            case 'yarn':
                command = 'yarn audit --json';
                break;
            case 'pnpm':
                command = 'pnpm audit --json';
                break;
            case 'bun':
                command = 'bun audit --json';
                break;
            default:
                command = 'npm audit --json';
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
