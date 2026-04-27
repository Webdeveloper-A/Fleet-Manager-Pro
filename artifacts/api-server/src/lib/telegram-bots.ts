import {
  TELEGRAM_ALERT_BOT_TOKEN,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_SUPPORT_BOT_TOKEN,
} from "./env";

export type TelegramBotType = "alerts" | "support";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function getTelegramBotToken(botType: TelegramBotType): string | undefined {
  if (botType === "alerts") {
    return TELEGRAM_ALERT_BOT_TOKEN ?? TELEGRAM_BOT_TOKEN;
  }

  return TELEGRAM_SUPPORT_BOT_TOKEN;
}

export function isTelegramBotConfigured(botType: TelegramBotType): boolean {
  return Boolean(getTelegramBotToken(botType));
}

export async function sendTelegramMessageToChat({
  botType,
  chatId,
  text,
}: {
  botType: TelegramBotType;
  chatId: string;
  text: string;
}) {
  const botToken = getTelegramBotToken(botType);

  if (!botToken) {
    throw new Error(
      botType === "alerts"
        ? "Telegram bildirishnoma boti tokeni sozlanmagan"
        : "Telegram support boti tokeni sozlanmagan",
    );
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: text.slice(0, 3900),
            disable_web_page_preview: true,
          }),
        },
        15000,
      );

      const data = (await res.json()) as {
        ok: boolean;
        description?: string;
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.description || `Telegram API error: ${res.status}`);
      }

      return data;
    } catch (err) {
      lastError = err;

      if (attempt < 3) {
        await sleep(1500 * attempt);
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Telegram xabar yuborilmadi";
  throw new Error(`Telegramga ulanishda xatolik: ${message}`);
}