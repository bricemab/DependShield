import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectsService } from '../projects/projects.service';
import { ScansService } from '../scans/scans.service';
import * as PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify/sync';

@Injectable()
export class ReportsService {
    constructor(
        private projectsService: ProjectsService,
        private scansService: ScansService,
    ) { }

    async generatePdf(projectId: number): Promise<Buffer> {
        const project = await this.projectsService.findOneById(projectId);
        const lastScan = await this.scansService.findLastScan(projectId);

        if (!project || !lastScan) {
            throw new NotFoundException('Project or scan not found');
        }

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument();
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                resolve(Buffer.concat(buffers));
            });

            // Cover
            doc.fontSize(25).text('Security Scan Report', { align: 'center' });
            doc.moveDown();
            doc.fontSize(16).text(`Project: ${project.name}`, { align: 'center' });
            doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
            doc.text(`Score: ${lastScan.score}/100`, { align: 'center' });

            doc.moveDown(2);

            // Summary
            doc.fontSize(20).text('Summary');
            doc.fontSize(12).text(`Total Vulnerabilities: ${lastScan.vulnerabilities.length}`);

            const counts = lastScan.vulnerabilities.reduce((acc, v) => {
                acc[v.severity] = (acc[v.severity] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            doc.text(`Critical: ${counts['critical'] || 0}`);
            doc.text(`High: ${counts['high'] || 0}`);
            doc.text(`Moderate: ${counts['moderate'] || 0}`);
            doc.text(`Low: ${counts['low'] || 0}`);

            doc.moveDown();

            // Details
            doc.addPage();
            doc.fontSize(20).text('Vulnerability Details');
            doc.moveDown();

            lastScan.vulnerabilities.forEach((v, index) => {
                doc.fontSize(14).text(`${index + 1}. ${v.packageName} (${v.severity.toUpperCase()})`);
                doc.fontSize(10).text(`New Version: ${v.version}`);
                doc.text(`Title: ${v.title}`);
                if (v.cve) doc.text(`CVE: ${v.cve}`);
                doc.moveDown();
            });

            doc.end();
        });
    }

    async generateCsv(projectId: number): Promise<string> {
        const project = await this.projectsService.findOneById(projectId);
        const lastScan = await this.scansService.findLastScan(projectId);

        if (!project || !lastScan) {
            throw new NotFoundException('Project or scan not found');
        }

        const data = lastScan.vulnerabilities.map(v => ({
            Package: v.packageName,
            CurrentVersion: v.version,
            Severity: v.severity,
            CVE: v.cve || '',
            Title: v.title,
            Whitelisted: v.whitelisted ? 'Yes' : 'No'
        }));

        return stringify(data, { header: true });
    }
}
