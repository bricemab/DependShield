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
import { EpssService } from '../epss/epss.service';

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
        private epssService: EpssService,
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
            await this.updateProgress(scan, 10, 'Initializing scan...');

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
                    `http://localhost:5173/projects/${scan.project.id}/scans/${scan.id}`, // TODO: Use real env config
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
            await this.updateProgress(scan, 20, 'Lockfile downloaded');

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


            // Run Secret Scan (moved early for better progress UX)
            const secretVulns = await this.scanSecrets(
                scan.project.repositoryUrl,
                scan.project.branch,
                user.accessToken,
                async (processed, total) => {
                    // Map progress to 20-70% range
                    const percent = 20 + Math.floor((processed / total) * 50);
                    // Update frequently
                    if (processed % Math.ceil(total / 100) === 0 || processed === total) {
                        await this.updateProgress(scan, percent, `Scanning files: ${processed}/${total}`);
                    }
                }
            );
            await this.updateProgress(scan, 70, 'Secret scan completed');

            // Generate Dependency Graph
            scan.dependencyGraph = await this.generateDependencyGraph(scanDir, scan.project.packageManager);
            await this.updateProgress(scan, 75, 'Dependency graph generated');

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
            await this.updateProgress(scan, 85, 'Dependency audit completed');

            // Run Docker Scan
            const dockerVulns = await this.scanDocker(scan.project.repositoryUrl, scan.project.branch, user.accessToken);
            vulnerabilities.push(...dockerVulns);
            await this.updateProgress(scan, 90, 'Docker scan completed');
            vulnerabilities.push(...secretVulns);

            // Secret scan moved up

            // Fetch whitelist rules
            const whitelistRules = await this.whitelistService.findAllByProject(scan.project.id);

            // Enrich vulnerabilities with EPSS scores
            this.logger.log(`Fetching EPSS scores for ${vulnerabilities.length} vulnerabilities...`);

            // Extract CVEs and GHSA IDs
            const cves = vulnerabilities
                .filter(v => v.cve)
                .map(v => v.cve);

            if (cves.length > 0) {
                try {
                    // Convert GHSA IDs to CVEs
                    const ghsaIds = cves.filter(cve => cve.startsWith('GHSA-'));
                    const realCves = cves.filter(cve => cve.startsWith('CVE-'));

                    this.logger.log(`Found ${ghsaIds.length} GHSA IDs and ${realCves.length} CVEs`);

                    // Convert GHSA to CVE using GitHub API
                    let ghsaToCveMap = new Map<string, string>();
                    if (ghsaIds.length > 0) {
                        this.logger.log(`Converting ${ghsaIds.length} GHSA IDs to CVEs...`);
                        ghsaToCveMap = await this.githubService.getCvesFromGhsas(ghsaIds, user.accessToken);
                        this.logger.log(`Successfully converted ${ghsaToCveMap.size} GHSA IDs to CVEs`);
                    }

                    // Update vulnerabilities with real CVEs
                    vulnerabilities.forEach(vuln => {
                        if (vuln.cve && vuln.cve.startsWith('GHSA-')) {
                            const realCve = ghsaToCveMap.get(vuln.cve);
                            if (realCve) {
                                vuln.cve = realCve;
                            }
                        }
                    });

                    // Now fetch EPSS scores with real CVEs
                    const finalCves = vulnerabilities
                        .filter(v => v.cve && v.cve.startsWith('CVE-'))
                        .map(v => v.cve);

                    if (finalCves.length > 0) {
                        this.logger.log(`Fetching EPSS scores for ${finalCves.length} CVEs...`);
                        const epssScores = await this.epssService.getCachedOrFetch(finalCves);
                        this.logger.log(`Successfully fetched ${epssScores.size} EPSS scores`);

                        vulnerabilities.forEach(vuln => {
                            if (vuln.cve && epssScores.has(vuln.cve)) {
                                const epss = epssScores.get(vuln.cve);
                                vuln.epssScore = epss.epss;
                                vuln.epssPercentile = epss.percentile;
                            }
                        });
                    }
                } catch (epssError) {
                    this.logger.warn(`Failed to fetch EPSS scores: ${epssError.message}`);
                    // Continue without EPSS scores - graceful degradation
                }
            }
            await this.updateProgress(scan, 85, 'EPSS enrichment completed');

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
            await this.updateProgress(scan, 95, 'Saving vulnerabilities...');

            // Calculate score
            const activeVulnerabilities = await this.vulnerabilitiesRepository.find({
                where: { scanId: scan.id, whitelisted: false }
            });
            const score = this.calculateScore(activeVulnerabilities);

            // Update scan
            scan.status = ScanStatus.COMPLETED;
            scan.vulnerabilitiesCount = activeVulnerabilities.length;
            scan.score = score;
            scan.progress = 100;
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
                    `http://localhost:5173/projects/${scan.project.id}/scans/${scan.id}`,
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
                            `http://localhost:5173/projects/${scan.project.id}/scans/${scan.id}`,
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

    private async updateProgress(scan: Scan, progress: number, message?: string) {
        scan.progress = progress;
        await this.scansRepository.save(scan);
        this.logger.log(`Scan ${scan.id} progress: ${progress}%${message ? ` - ${message}` : ''}`);
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

                    // npm audit v2 format: vulnerabilities are in the 'via' array
                    if (vulnData.via && Array.isArray(vulnData.via)) {
                        for (const viaItem of vulnData.via) {
                            // Skip if via item is just a string (dependency name)
                            if (typeof viaItem === 'string') continue;

                            // Extract CVE from GitHub Advisory URL or use source as fallback
                            let cve = null;
                            if (viaItem.url) {
                                // Try to extract CVE from the advisory page
                                // GitHub advisories often have CVE in the URL or we can use the GHSA ID
                                const ghsaMatch = viaItem.url.match(/GHSA-[\w-]+/);
                                if (ghsaMatch) {
                                    // Use GHSA ID as CVE identifier for EPSS lookup
                                    // Note: EPSS API uses CVE format, so we'll need to handle this
                                    cve = ghsaMatch[0];
                                }
                            }

                            // If we have a source ID, we can try to use it
                            if (!cve && viaItem.source) {
                                cve = `GHSA-${viaItem.source}`;
                            }

                            vulnerabilities.push({
                                packageName,
                                version: vulnData.range || 'unknown',
                                severity: this.mapSeverity(viaItem.severity || vulnData.severity),
                                title: viaItem.title || 'Vulnerability found',
                                description: viaItem.title || '',
                                cve: cve,
                                url: viaItem.url || null,
                            });
                        }
                    } else {
                        // Fallback for old format or if via is not present
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

            if (/ FROM\s+ [\w\-\/\.]+(:latest)?\s+/i.test(dockerfileContent) || !/FROM\s+[\w\-\/\.]+:/i.test(dockerfileContent)) {
                if (/ FROM\s + [\w\-\/\.]+:latest/i.test(dockerfileContent) || /FROM\s+[\w\-\/\.]+\s+$/m.test(dockerfileContent)) {
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

    private async scanSecrets(repoUrl: string, branch: string, token: string, onProgress?: (processed: number, total: number) => Promise<void>): Promise<Partial<Vulnerability>[]> {
        const vulns: Partial<Vulnerability>[] = [];
        this.logger.log(`[SecretScan] Starting advanced secret scan for ${repoUrl} on branch ${branch}...`);

        // Patterns for secret detection
        const secretPatterns = [
            { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/, severity: VulnerabilitySeverity.CRITICAL },
            { name: 'AWS Secret Access Key', regex: /["']?[A-Za-z0-9\/+=]{40}["']?/, contextRegex: /aws_secret_access_key|aws_secret_key|secret_key/i, severity: VulnerabilitySeverity.CRITICAL },
            { name: 'Stripe Secret Key', regex: /sk_live_[0-9a-zA-Z]{24}/, severity: VulnerabilitySeverity.CRITICAL },
            { name: 'Stripe Publishable Key', regex: /pk_live_[0-9a-zA-Z]{24}/, severity: VulnerabilitySeverity.HIGH }, // Less critical but still bad practice
            { name: 'Google API Key', regex: /AIza[0-9A-Za-z-_]{35}/, severity: VulnerabilitySeverity.HIGH },
            { name: 'GitHub Personal Access Token', regex: /ghp_[0-9a-zA-Z]{36}/, severity: VulnerabilitySeverity.CRITICAL },
            { name: 'GitHub OAuth Access Token', regex: /gho_[0-9a-zA-Z]{36}/, severity: VulnerabilitySeverity.CRITICAL },
            { name: 'Slack Bot Token', regex: /xoxb-[0-9]{11}-[0-9]{11}-[0-9a-zA-Z]{24}/, severity: VulnerabilitySeverity.CRITICAL },
            { name: 'Generic Private Key', regex: /-----BEGIN RSA PRIVATE KEY-----/, severity: VulnerabilitySeverity.CRITICAL },
        ];

        try {
            // Recursive file scanning logic
            // Since we don't have the full repo on disk (we fetch specific files via API usually),
            // we first need to get the file tree.
            // GitHub API: GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1

            const tree = await this.githubService.getRepoTree(repoUrl, branch, token);

            // Limit scanning to avoid timeouts on huge repos
            const MAX_FILES_TO_SCAN = 200;
            let scannedCount = 0;

            const filesToScan = tree.filter(file => {
                if (file.type !== 'blob') return false; // Only files
                if (file.size > 500 * 1024) return false; // Skip files > 500KB

                const pathLower = file.path.toLowerCase();
                // Exclusions
                if (pathLower.includes('node_modules/') ||
                    pathLower.includes('dist/') ||
                    pathLower.includes('build/') ||
                    pathLower.includes('vendor/') ||
                    pathLower.endsWith('.lock') ||
                    pathLower.endsWith('.png') ||
                    pathLower.endsWith('.jpg') ||
                    pathLower.endsWith('.jpeg') ||
                    pathLower.endsWith('.svg') ||
                    pathLower.endsWith('.eot') ||
                    pathLower.endsWith('.woff') ||
                    pathLower.endsWith('.woff2') ||
                    pathLower.endsWith('.ttf') ||
                    pathLower.endsWith('.pdf') ||
                    pathLower.endsWith('.zip') ||
                    pathLower.endsWith('.exe')) {
                    return false;
                }
                return true;
            });

            this.logger.log(`[SecretScan] Found ${filesToScan.length} potential files. Scanning up to ${MAX_FILES_TO_SCAN}...`);

            for (const file of filesToScan) {
                if (scannedCount >= MAX_FILES_TO_SCAN) break;

                try {
                    const content = await this.githubService.getFileContent(repoUrl, file.path, branch, token);
                    scannedCount++;
                    if (onProgress) await onProgress(scannedCount, filesToScan.length);

                    // Check for .env specifically (high priority)
                    if (file.path.endsWith('.env')) {
                        vulns.push({
                            packageName: 'Secret Leak',
                            version: 'N/A',
                            severity: VulnerabilitySeverity.CRITICAL,
                            title: '.env file committed',
                            description: `The file ${file.path} is committed to the repository. It likely contains sensitive secrets.`,
                            type: VulnerabilityType.SECRET,
                            isDevDependency: false,
                            url: `${repoUrl.replace('.git', '')}/blob/${branch}/${file.path}`
                        });
                        continue; // Don't regex scan .env, just flag the file itself
                    }

                    // Regex scanning
                    for (const pattern of secretPatterns) {
                        // For generic patterns (like AWS Secret Key which is just a 40-char string),
                        // we need context validation (key name nearby).
                        if (pattern.contextRegex) {
                            if (!pattern.contextRegex.test(content)) continue;
                        }

                        if (pattern.regex.test(content)) {
                            // Extract a snippet (carefully masking the secret)
                            const match = content.match(pattern.regex);
                            const secret = match ? match[0] : '';
                            const maskedSecret = secret.substring(0, 4) + '...' + secret.substring(secret.length - 4);

                            vulns.push({
                                packageName: 'Secret Leak',
                                version: 'N/A',
                                severity: pattern.severity,
                                title: `${pattern.name} detected`,
                                description: `Found ${pattern.name} in ${file.path}. Pattern match: ${maskedSecret}`,
                                type: VulnerabilityType.SECRET,
                                isDevDependency: false,
                                url: `${repoUrl.replace('.git', '')}/blob/${branch}/${file.path}`
                            });
                        }
                    }
                } catch (e) {
                    // Ignore read errors (binary treated as text, etc.)
                }
            }

        } catch (e) {
            this.logger.error(`[SecretScan] Failed: ${e.message}`);
            // Fallback to simple check if tree fetch fails
            if (e.message.includes('Not Found') || e.message.includes('403')) {
                // ... old .env logic could be here as fallback
            }
        }

        return vulns;
    }

    private async generateDependencyGraph(scanDir: string, packageManager: string): Promise<any> {
        if (packageManager !== 'npm') return null;

        try {
            const lockPath = path.join(scanDir, 'package-lock.json');
            if (!await fs.pathExists(lockPath)) return null;

            const lockContent = await fs.readJson(lockPath);
            const nodes: any[] = [];
            const links: any[] = [];
            const addedNodes = new Set<string>();

            const addNode = (id: string, group: number) => {
                if (!addedNodes.has(id)) {
                    nodes.push({ id, group });
                    addedNodes.add(id);
                }
            };

            const rootName = lockContent.name || 'root';
            addNode(rootName, 1);

            let deps = lockContent.dependencies;
            if (!deps && lockContent.packages && lockContent.packages['']) {
                deps = lockContent.packages[''].dependencies;
            }

            if (deps) {
                for (const [name, version] of Object.entries(deps as any)) {
                    addNode(name, 2);
                    links.push({ source: rootName, target: name });

                    if (lockContent.dependencies && lockContent.dependencies[name] && lockContent.dependencies[name].dependencies) {
                        for (const [subName, subVer] of Object.entries(lockContent.dependencies[name].dependencies as any)) {
                            addNode(subName, 3);
                            links.push({ source: name, target: subName });
                        }
                    }
                }
            }

            return { nodes, links };
        } catch (e) {
            this.logger.warn(`Failed to generate dependency graph: ${e.message}`);
            return null;
        }
    }
}
