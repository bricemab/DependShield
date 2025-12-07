import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class QueueSchedulerService {
    private readonly logger = new Logger(QueueSchedulerService.name);
    private readonly MAX_WAIT_TIME_MS = 5 * 60 * 1000; // 5 Minutes

    constructor(@InjectQueue('scans') private scansQueue: Queue) { }

    // Check every minute
    @Cron(CronExpression.EVERY_MINUTE)
    async handleStarvation() {
        this.logger.debug('Checking for starved jobs in queue...');

        // Get all waiting jobs
        const waitingJobs = await this.scansQueue.getWaiting();

        let promotedCount = 0;
        const now = Date.now();

        for (const job of waitingJobs) {
            // Check if job is older than MAX_WAIT_TIME
            if (job.timestamp + this.MAX_WAIT_TIME_MS < now) {
                // If priority is not already high (1)
                // Note: job.opts.priority is where priority is stored
                if (job.opts.priority && job.opts.priority > 1) {
                    // Update priority to 1 (High/Enterprise level)
                    // Bull doesn't have a direct updatePriority method easily exposed on Job instance in all versions,
                    // but we can use job.promote() which effectively makes it execute sooner, 
                    // or re-add it. However, 'job.promote()' puts it to the front essentially.

                    // Actually, simpler approach for "Anti-Starvation":
                    // If a low priority job waits too long, we bump its priority.

                    try {
                        // Accessing underlying Bull job simple priority update might utilize 'update' or just promote
                        // promote() makes it process *next*, essentially making it highest priority.
                        await job.promote();
                        promotedCount++;
                        this.logger.log(`Promoted starving job ${job.id} (scan ${job.data.scanId}) - Waited > 5min`);
                    } catch (e) {
                        this.logger.warn(`Failed to promote job ${job.id}: ${e.message}`);
                    }
                }
            }
        }

        if (promotedCount > 0) {
            this.logger.log(`Anti-Starvation: Promoted ${promotedCount} jobs to immediate execution.`);
        }
    }
}
