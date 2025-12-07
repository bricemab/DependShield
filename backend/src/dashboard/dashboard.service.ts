import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../projects/project.entity';
import { Scan, ScanStatus } from '../scans/scan.entity';
import { Vulnerability } from '../scans/vulnerability.entity';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(Project)
        private projectRepository: Repository<Project>,
        @InjectRepository(Scan)
        private scanRepository: Repository<Scan>,
    ) { }

    async getStats(userId: number) {
        // 1. Total Projects
        const totalProjects = await this.projectRepository.count({
            where: { userId },
        });

        // 2. Projects with latest scan data
        // We fetch projects to calculate average score and find risky ones
        const projects = await this.projectRepository.find({
            where: { userId },
        });

        // 2b. We need the latest scan for each project to get accurate current stats
        // This could be optimized with a custom query builder but loop is fine for MVP
        let totalScore = 0;
        let scoredProjectsCount = 0;
        let totalVulnerabilities = { critical: 0, high: 0, moderate: 0, low: 0 };

        // Prepare list for "Top Risky Projects"
        const projectStats = [];

        for (const project of projects) {
            const lastScan = await this.scanRepository.findOne({
                where: { projectId: project.id, status: ScanStatus.COMPLETED },
                order: { startedAt: 'DESC' },
                relations: ['vulnerabilities'],
            });

            if (lastScan) {
                totalScore += Number(lastScan.score || 0);
                scoredProjectsCount++;

                // Sum vulnerabilities
                lastScan.vulnerabilities.forEach(v => {
                    if (!v.whitelisted) { // Should check whitelist? Assuming boolean flag on vuln for now or derived
                        // Actually vulnerability entity has whitelisted column
                        if (v.severity === 'critical') totalVulnerabilities.critical++;
                        else if (v.severity === 'high') totalVulnerabilities.high++;
                        else if (v.severity === 'moderate') totalVulnerabilities.moderate++;
                        else if (v.severity === 'low') totalVulnerabilities.low++;
                    }
                });

                projectStats.push({
                    id: project.id,
                    name: project.name,
                    repositoryName: project.repositoryName,
                    score: Number(lastScan.score || 0),
                    lastScanDate: lastScan.startedAt,
                    vulnerabilitiesCount: lastScan.vulnerabilitiesCount,
                    criticalCount: lastScan.vulnerabilities.filter(v => v.severity === 'critical' && !v.whitelisted).length,
                    highCount: lastScan.vulnerabilities.filter(v => v.severity === 'high' && !v.whitelisted).length,
                });
            } else {
                projectStats.push({
                    id: project.id,
                    name: project.name,
                    repositoryName: project.repositoryName,
                    score: null, // No scan yet
                    lastScanDate: null,
                    vulnerabilitiesCount: 0,
                    criticalCount: 0,
                    highCount: 0,
                });
            }
        }

        const averageScore = scoredProjectsCount > 0 ? (totalScore / scoredProjectsCount) : 0;

        // 3. Recent Scans (Global Activity)
        // Fetch last 5 scans across all user's projects
        // We can do this by joining project
        const recentScans = await this.scanRepository.find({
            where: { project: { userId } },
            order: { startedAt: 'DESC' },
            take: 5,
            relations: ['project'],
        });

        // Sort risky projects: Lowest score first, then most critical vulns
        const riskyProjects = projectStats
            .filter(p => p.score !== null)
            .sort((a, b) => (a.score || 0) - (b.score || 0))
            .slice(0, 5);

        return {
            totalProjects,
            averageScore: Math.round(averageScore),
            vulnerabilities: totalVulnerabilities,
            riskyProjects,
            recentScans: recentScans.map(s => ({
                id: s.id,
                number: s.number,
                projectId: s.projectId,
                projectName: s.project?.name,
                status: s.status,
                score: s.score,
                startedAt: s.startedAt,
                vulnerabilitiesCount: s.vulnerabilitiesCount
            })),
        };
    }
}
