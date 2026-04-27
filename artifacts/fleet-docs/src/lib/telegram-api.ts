export type TelegramBotType = "alerts" | "support";

export type TelegramLink = {
  id: string;
  botType: TelegramBotType;
  telegramChatId: string;
  telegramUsername?: string | null;
  telegramFirstName?: string | null;
  isActive: boolean;
  linkedAt: string;
  updatedAt: string;
};

export type TelegramLinkCode = {
  botType: TelegramBotType;
  code: string;
  expiresAt: string;
  instruction: string;
  startCommand: string;
};

async function apiRequest<T>(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed with ${res.status}`;

    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  return (await res.json()) as T;
}

export function listTelegramLinks(token: string | null) {
  return apiRequest<{ items: TelegramLink[] }>("/api/telegram/links", token);
}

export function createTelegramLinkCode(token: string | null, botType: TelegramBotType) {
  return apiRequest<TelegramLinkCode>("/api/telegram/link-codes", token, {
    method: "POST",
    body: JSON.stringify({ botType }),
  });
}

export function disconnectTelegramLink(token: string | null, botType: TelegramBotType) {
  return apiRequest<{ ok: boolean }>(`/api/telegram/links/${botType}`, token, {
    method: "DELETE",
  });
}