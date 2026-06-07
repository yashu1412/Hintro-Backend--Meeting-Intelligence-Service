// src/integrations/telegram.ts
import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface TelegramSendResult {
  success: boolean;
  error?: string;
}

export async function sendTelegramMessage(message: string): Promise<TelegramSendResult> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    logger.warn('Telegram not configured — skipping notification');
    return { success: false, error: 'Telegram not configured' };
  }

  try {
    await axios.post(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      },
      { timeout: 10000 },
    );
    logger.info('Telegram notification sent successfully');
    return { success: true };
  } catch (err: any) {
    const errorMsg = err?.response?.data?.description ?? err.message ?? 'Unknown error';
    logger.error({ error: errorMsg }, 'Failed to send Telegram notification');
    return { success: false, error: errorMsg };
  }
}

export function formatOverdueMessage(item: {
  task: string;
  assignee: string;
  dueDate: Date | null;
  meeting?: { title: string } | null;
}): string {
  const dueStr = item.dueDate
    ? item.dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'No due date';

  return [
    `🔔 <b>Overdue Reminder</b>`,
    ``,
    `📋 <b>Task:</b> ${item.task}`,
    `👤 <b>Assigned To:</b> ${item.assignee}`,
    `📅 <b>Due Date:</b> ${dueStr}`,
    item.meeting ? `🗓 <b>Meeting:</b> ${item.meeting.title}` : '',
    ``,
    `⚠️ This action item is overdue. Please update its status.`,
  ]
    .filter(Boolean)
    .join('\n');
}
