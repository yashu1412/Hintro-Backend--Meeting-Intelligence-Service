// src/jobs/overdueReminder.job.ts
import prisma from '../config/database';
import { sendTelegramMessage, formatOverdueMessage } from '../integrations/telegram';
import { logger } from '../utils/logger';

export async function runOverdueReminderJob(): Promise<void> {
  logger.info('Running overdue reminder job...');

  const now = new Date();

  const overdueItems = await prisma.actionItem.findMany({
    where: {
      status: { not: 'COMPLETED' },
      dueDate: { lt: now, not: null },
    },
    include: {
      meeting: { select: { title: true } },
    },
  });

  if (overdueItems.length === 0) {
    logger.info('No overdue items found — job complete');
    return;
  }

  logger.info({ count: overdueItems.length }, 'Found overdue action items');

  const results = await Promise.allSettled(
    overdueItems.map(async (item) => {
      const message = formatOverdueMessage({
        task: item.task,
        assignee: item.assignee,
        dueDate: item.dueDate,
        meeting: item.meeting,
      });

      const result = await sendTelegramMessage(message);

      // Record the reminder log regardless of success/failure
      await prisma.reminderLog.create({
        data: {
          actionItemId: item.id,
          channel: 'telegram',
          message,
          success: result.success,
          errorMessage: result.error ?? null,
        },
      });

      if (!result.success) {
        logger.warn(
          { actionItemId: item.id, error: result.error },
          'Reminder notification failed',
        );
      } else {
        logger.info({ actionItemId: item.id, assignee: item.assignee }, 'Reminder sent');
      }

      return { itemId: item.id, ...result };
    }),
  );

  const succeeded = results.filter(
    (r) => r.status === 'fulfilled' && (r.value as any).success,
  ).length;
  const failed = results.length - succeeded;

  logger.info({ total: overdueItems.length, succeeded, failed }, 'Overdue reminder job complete');
}
