import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Scan } from '../scans/scan.entity';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(private readonly mailerService: MailerService) { }

    async sendScanResultEmail(to: string, scan: Scan) {
        try {
            const subject = `Scan Result for ${scan.project.name}: ${scan.status}`;
            const scoreColor = this.getScoreColor(scan.score);

            const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">DependShield Scan Report</h2>
          <p>Here are the results for your project <strong>${scan.project.name}</strong>.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Status:</strong> ${scan.status}</p>
            <p><strong>Score:</strong> <span style="color: ${scoreColor}; font-weight: bold;">${scan.score}/100</span></p>
            <p><strong>Vulnerabilities Found:</strong> ${scan.vulnerabilitiesCount}</p>
          </div>

          <a href="${process.env.FRONTEND_URL}/scans/${scan.id}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Full Report</a>
        </div>
      `;

            await this.mailerService.sendMail({
                to,
                subject,
                html,
            });

            this.logger.log(`Email sent to ${to} for scan ${scan.id}`);
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}`, error);
        }
    }

    private getScoreColor(score: number): string {
        if (score >= 90) return 'green';
        if (score >= 70) return 'orange';
        return 'red';
    }
}
