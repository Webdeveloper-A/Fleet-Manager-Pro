export function isTelegramConfigured() {
  return Boolean(process.env["TELEGRAM_BOT_TOKEN"] && process.env["TELEGRAM_CHAT_ID"]);
}

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

export async function sendTelegramMessage(text: string) {
  const botToken = process.env["TELEGRAM_BOT_TOKEN"];
  const chatId = process.env["TELEGRAM_CHAT_ID"];

  if (!botToken || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID topilmadi");
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