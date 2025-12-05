import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as simpleGit from 'simple-git';
import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Scan, ScanStatus } from './scan.entity';
import { Vulnerability, VulnerabilitySeverity } from './vulnerability.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { WhitelistService } from './whitelist.service';

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

            this.logger.log(`Cloning repository for scan ${scanId}...`);

            // Clone repository
            const git = simpleGit.default();
            await git.clone(scan.project.repositoryUrl, scanDir, ['--depth', '1', '--branch', scan.project.branch]);

            this.logger.log(`Running vulnerability scan for scan ${scanId}...`);

            // Run audit based on package manager
            const auditDir = scan.project.lockfilePath ? path.join(scanDir, scan.project.lockfilePath) : scanDir;
            const auditResult = await this.runAudit(auditDir, scan.project.packageManager);

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

            // Cleanup
            await fs.remove(scanDir);

            this.logger.log(`Scan ${scanId} completed successfully`);
        } catch (error) {
            this.logger.error(`Scan ${scanId} failed:`, error);
            scan.status = ScanStatus.FAILED;
            scan.errorMessage = error.message;
            scan.completedAt = new Date();
            await this.scansRepository.save(scan);
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
            const { stdout } = await execAsync(command, { cwd: dir, timeout: 60000 });
            return stdout;
        } catch (error) {
            // npm audit returns non-zero exit code when vulnerabilities are found
            return error.stdout || '{}';
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
