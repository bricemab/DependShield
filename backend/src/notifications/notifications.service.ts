import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Scan } from '../scans/scan.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendScanResultEmail(to: string, scan: Scan) {
    try {
      const subject = `Scan Result for ${scan.project.name}: ${scan.status}`;
      const scoreColor = this.getScoreColor(scan.score);

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; }
              .header { background: #0f172a; padding: 30px; text-align: center; }
              .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 1px; }
              .header p { color: #94a3b8; margin: 5px 0 0; font-size: 14px; }
              .content { padding: 40px 30px; }
              .score-card { text-align: center; margin: 20px 0 30px; }
              .score-value { font-size: 48px; font-weight: 700; color: ${this.getHexColor(scoreColor)}; margin-bottom: 5px; display: block; }
              .score-label { font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; font-weight: 600; }
              .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 6px; border: 1px solid #e2e8f0; }
              .stat-item { text-align: center; }
              .stat-value { font-size: 20px; font-weight: 600; color: #0f172a; display: block; }
              .stat-label { font-size: 12px; color: #64748b; }
              .btn { display: block; width: 100%; max-width: 250px; margin: 0 auto; padding: 14px 25px; background-color: #0f172a; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; text-align: center; transition: background 0.3s; }
              .btn:hover { background-color: #334155; }
              .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${process.env.FRONTEND_URL}/logo.png" alt="DependShield Logo" style="height: 40px; margin-bottom: 10px;">
              <h1>DependShield</h1>
              <p>Security Scan Report</p>
            </div>
            
            <div class="content">
              <p style="text-align: center; font-size: 16px; margin-bottom: 30px;">
                The vulnerability scan for <strong>${scan.project.name}</strong> has completed.
              </p>

              <div class="score-card">
                  <span class="score-value">${scan.score}</span>
                  <span class="score-label">Security Score</span>
              </div>

              <div class="stats-grid">
                  <div class="stat-item">
                      <span class="stat-value">${scan.vulnerabilitiesCount}</span>
                      <span class="stat-label">Vulnerabilities</span>
                  </div>
                   <div class="stat-item">
                      <span class="stat-value">${scan.status.toUpperCase()}</span>
                      <span class="stat-label">Status</span>
                  </div>
              </div>

              <a href="${process.env.FRONTEND_URL}/projects/${scan.project.id}" class="btn">View Full Report</a>
            </div>

            <div class="footer">
              &copy; ${new Date().getFullYear()} DependShield. All rights reserved.<br>
              <a href="#" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a> from these notifications.
            </div>
          </div>
        </body>
        </html>
      `;

      await this.mailerService.sendMail({
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent to ${to} for scan ${scan.id}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }

  private getScoreColor(score: number): string {
    if (score >= 90) return 'green';
    if (score >= 70) return 'orange';
    return 'red';
  }

  private getHexColor(name: string): string {
    switch (name) {
      case 'green':
        return '#10b981';
      case 'orange':
        return '#f59e0b';
      case 'red':
        return '#ef4444';
      default:
        return '#3b82f6';
    }
  }
  async sendWelcomeEmail(to: string, username: string) {
    try {
      const subject = 'Welcome to DependShield! 🛡️';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; }
              .header { background: #0f172a; padding: 30px; text-align: center; }
              .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 1px; }
              .header p { color: #94a3b8; margin: 5px 0 0; font-size: 14px; }
              .content { padding: 40px 30px; }
              .welcome-icon { font-size: 48px; text-align: center; display: block; margin-bottom: 20px; }
              .feature-list { list-style: none; padding: 0; margin: 30px 0; }
              .feature-list li { margin-bottom: 15px; padding-left: 25px; position: relative; }
              .feature-list li::before { content: '✓'; color: #10b981; font-weight: bold; position: absolute; left: 0; }
              .btn { display: block; width: 100%; max-width: 250px; margin: 0 auto; padding: 14px 25px; background-color: #0f172a; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; text-align: center; transition: background 0.3s; }
              .btn:hover { background-color: #334155; }
              .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${process.env.FRONTEND_URL}/logo.png" alt="DependShield Logo" style="height: 40px; margin-bottom: 10px;">
              <h1>DependShield</h1>
              <p>Welcome Aboard!</p>
            </div>
            
            <div class="content">
              <span class="welcome-icon">👋</span>
              <p style="font-size: 16px; margin-bottom: 20px;">
                Hi <strong>${username}</strong>, thanks for joining DependShield!
              </p>
              <p style="color: #64748b; line-height: 1.6;">
                You are now ready to secure your projects. DependShield helps you monitor vulnerabilities, track dependencies, and maintain a healthy codebase.
              </p>

              <ul class="feature-list">
                  <li><strong>Scan</strong> your GitHub repositories automatically.</li>
                  <li><strong>Monitor</strong> security scores and trends over time.</li>
                  <li><strong>Integrate</strong> badges directly into your README.</li>
              </ul>

              <a href="${process.env.FRONTEND_URL}/dashboard" class="btn">Create First Project</a>
            </div>

            <div class="footer">
              &copy; ${new Date().getFullYear()} DependShield. All rights reserved.<br>
              <a href="#" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a> from these notifications.
            </div>
          </div>
        </body>
        </html>
      `;

      await this.mailerService.sendMail({
        to,
        subject,
        html,
      });
      this.logger.log(`Welcome email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}`, error);
      // Don't throw, just log. Welcome email failure shouldn't block login.
    }
  }
}
