// src/jobs/scheduler.ts
import cron from 'node-cron';
import { runOverdueReminderJob } from './overdueReminder.job';
import { logger } from '../utils/logger';

export function startScheduler(): void {
  logger.info('Scheduler starting...');

  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    logger.info('Cron triggered: overdueReminderJob');
    try {
      await runOverdueReminderJob();
    } catch (err: any) {
      logger.error({ error: err.message }, 'Overdue reminder job threw an unexpected error');
    }
  });

  logger.info('Overdue reminder cron scheduled — runs every hour at :00');
}

// Allow manual trigger for testing / development
export { runOverdueReminderJob as triggerNow };
