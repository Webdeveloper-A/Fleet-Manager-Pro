export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const JWT_SECRET = process.env.JWT_SECRET ?? process.env.SESSION_SECRET ?? "fleet-docs-dev-secret-change-me";
export const JWT_EXPIRES_IN = "7d";
