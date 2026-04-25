export async function sendTelegramTest(token: string | null | undefined) {
  if (!token) {
    throw new Error("Avval tizimga qayta kiring.");
  }

  const res = await fetch("/api/notifications/send-telegram-test", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Telegram test xabar yuborilmadi.");
  }

  return res.json();
}

export async function sendExpiryAlerts(token: string | null | undefined) {
  if (!token) {
    throw new Error("Avval tizimga qayta kiring.");
  }

  const res = await fetch("/api/notifications/send-expiry-alerts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Telegram alert yuborilmadi.");
  }

  return res.json();
}