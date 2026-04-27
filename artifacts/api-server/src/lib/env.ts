export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export const NODE_ENV = optionalEnv("NODE_ENV") ?? "development";

export const DATABASE_URL = requireEnv("DATABASE_URL");

export const JWT_SECRET = requireEnv("JWT_SECRET");

export const JWT_EXPIRES_IN = optionalEnv("JWT_EXPIRES_IN") ?? "7d";

export const TELEGRAM_BOT_TOKEN = optionalEnv("TELEGRAM_BOT_TOKEN");

export const TELEGRAM_CHAT_ID = optionalEnv("TELEGRAM_CHAT_ID");
export const TELEGRAM_ALERT_BOT_TOKEN =
  optionalEnv("TELEGRAM_ALERT_BOT_TOKEN") ?? TELEGRAM_BOT_TOKEN;

export const TELEGRAM_SUPPORT_BOT_TOKEN = optionalEnv("TELEGRAM_SUPPORT_BOT_TOKEN");

export const ENABLE_DEMO_SEED = optionalEnv("ENABLE_DEMO_SEED") === "true";

export const STORAGE_DRIVER = optionalEnv("STORAGE_DRIVER") ?? "local";

export const R2_ACCOUNT_ID = optionalEnv("R2_ACCOUNT_ID");

export const R2_ACCESS_KEY_ID = optionalEnv("R2_ACCESS_KEY_ID");

export const R2_SECRET_ACCESS_KEY = optionalEnv("R2_SECRET_ACCESS_KEY");

export const R2_BUCKET_NAME = optionalEnv("R2_BUCKET_NAME");

export function validateBackendEnv(): void {
  if (JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long.");
  }

  if (NODE_ENV === "production" && ENABLE_DEMO_SEED) {
    throw new Error("ENABLE_DEMO_SEED must not be true in production.");
  }

if (TELEGRAM_CHAT_ID && !TELEGRAM_ALERT_BOT_TOKEN) {
  throw new Error("TELEGRAM_CHAT_ID requires TELEGRAM_ALERT_BOT_TOKEN or TELEGRAM_BOT_TOKEN.");
}

  if (!["local", "r2"].includes(STORAGE_DRIVER)) {
    throw new Error("STORAGE_DRIVER must be either 'local' or 'r2'.");
  }

  if (STORAGE_DRIVER === "r2") {
    const missing = [
      ["R2_ACCOUNT_ID", R2_ACCOUNT_ID],
      ["R2_ACCESS_KEY_ID", R2_ACCESS_KEY_ID],
      ["R2_SECRET_ACCESS_KEY", R2_SECRET_ACCESS_KEY],
      ["R2_BUCKET_NAME", R2_BUCKET_NAME],
    ].filter(([, value]) => !value);

    if (missing.length > 0) {
      throw new Error(
        `Missing R2 environment variables: ${missing.map(([name]) => name).join(", ")}`,
      );
    }
  }
}