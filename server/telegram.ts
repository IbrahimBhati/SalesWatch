import { Alert, AppSettings } from '../src/types';

export interface TelegramSendResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

export async function sendTelegramTestMessage(botToken: string, chatId: string, currency: string = 'PKR'): Promise<TelegramSendResult> {
  if (!botToken || !chatId) {
    return { success: false, error: 'Telegram Bot Token and Chat ID are both required.' };
  }

  const cleanToken = botToken.trim();
  const cleanChatId = chatId.trim();

  const text = `🎉 *SaleWatch Test Notification*\n\n` +
    `Your Telegram bot is successfully connected to SaleWatch!\n\n` +
    `You will receive immediate alerts whenever your monitored clothing stores drop prices by 50% or more.\n\n` +
    `_Timestamp: ${new Date().toLocaleString()}_`;

  try {
    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text,
        parse_mode: 'Markdown',
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    if (data.ok) {
      return { success: true, messageId: data.result?.message_id };
    } else {
      return { success: false, error: data.description || 'Failed to send message via Telegram Bot API.' };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error reaching Telegram Bot API.' };
  }
}

export async function sendSaleAlertNotification(
  settings: AppSettings,
  alert: Alert
): Promise<TelegramSendResult> {
  if (!settings.notification_enabled) {
    return { success: false, error: 'Notifications are currently disabled in Settings.' };
  }

  const botToken = settings.telegram_bot_token?.trim();
  const chatId = settings.telegram_chat_id?.trim();

  if (!botToken || !chatId) {
    return { success: false, error: 'Telegram Bot credentials are not configured.' };
  }

  const formatPrice = (amount: number, curr: string) => {
    return `${curr} ${amount.toLocaleString()}`;
  };

  const regPrice = alert.regular_price || alert.original_price;
  const hasPrevious = alert.previous_price && alert.previous_price > alert.sale_price && alert.previous_price !== regPrice;

  const caption = `🔥 *NEW SALE ALERT: ${alert.discount_percentage}% OFF*\n\n` +
    `*Store:* ${alert.website_name}\n` +
    `*Product:* ${alert.product_name}\n\n` +
    `*Regular Price:* ~${formatPrice(regPrice, alert.currency)}~\n` +
    (hasPrevious ? `*Previous Price:* ~${formatPrice(alert.previous_price!, alert.currency)}~\n` : '') +
    `*Current Price:* *${formatPrice(alert.sale_price, alert.currency)}*\n` +
    `*New Discount:* *${alert.discount_percentage}% OFF* (from regular price)\n\n` +
    `🔗 [View Product on Store](${alert.product_url})`;

  // If image URL is present and valid, send photo, else send text
  if (alert.image_url && (alert.image_url.startsWith('http://') || alert.image_url.startsWith('https://'))) {
    try {
      const photoUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
      const res = await fetch(photoUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: alert.image_url,
          caption,
          parse_mode: 'Markdown',
        }),
        signal: AbortSignal.timeout(12000),
      });

      const data = await res.json();
      if (data.ok) {
        return { success: true, messageId: data.result?.message_id };
      }
      // If photo send failed (e.g. invalid photo format or size), fallback to sendMessage
      console.warn('[Telegram] sendPhoto failed, falling back to sendMessage:', data.description);
    } catch (e: any) {
      console.warn('[Telegram] Photo send error, attempting text fallback:', e.message);
    }
  }

  // Text message fallback
  try {
    const textUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(textUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: caption,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    if (data.ok) {
      return { success: true, messageId: data.result?.message_id };
    }
    return { success: false, error: data.description || 'Telegram API returned an error.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reach Telegram Bot API.' };
  }
}
