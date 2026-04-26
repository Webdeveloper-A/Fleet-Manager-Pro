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

export const ENABLE_DEMO_SEED = optionalEnv("ENABLE_DEMO_SEED") === "true";

export function validateBackendEnv(): void {
  if (JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long.");
  }

  if (NODE_ENV === "production" && ENABLE_DEMO_SEED) {
    throw new Error("ENABLE_DEMO_SEED must not be true in production.");
  }

  if ((TELEGRAM_BOT_TOKEN && !TELEGRAM_CHAT_ID) || (!TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)) {
    throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be configured together.");
  }
}