import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Response } from 'express';
// import { AuthGuard } from '../auth/auth.guard'; // Assuming AuthGuard exists

@Controller('projects/:projectId/reports')
export class ReportsController {
    constructor(private reportsService: ReportsService) { }

    @Get('pdf')
    async downloadPdf(@Param('projectId') projectId: number, @Res() res: Response) {
        const buffer = await this.reportsService.generatePdf(projectId);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=report-${projectId}.pdf`,
            'Content-Length': buffer.length,
        });

        res.end(buffer);
    }

    @Get('csv')
    async downloadCsv(@Param('projectId') projectId: number, @Res() res: Response) {
        const csv = await this.reportsService.generateCsv(projectId);

        res.set({
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=report-${projectId}.csv`,
        });

        res.send(csv);
    }
    @Get('sbom')
    async downloadSbom(@Param('projectId') projectId: number, @Res() res: Response) {
        const sbom = await this.reportsService.generateSbom(projectId);

        res.set({
            'Content-Type': 'application/vnd.cyclonedx+json',
            'Content-Disposition': `attachment; filename=sbom-${projectId}.json`,
        });

        res.send(JSON.stringify(sbom, null, 2));
    }
}
