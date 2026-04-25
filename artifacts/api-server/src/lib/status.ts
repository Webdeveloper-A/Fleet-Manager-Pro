export type DocStatus = "valid" | "expiring" | "expired";

export const EXPIRING_THRESHOLD_DAYS = 15;
export const NOTIFY_THRESHOLD_DAYS = 10;

export function daysBetween(now: Date, end: Date): number {
  const ms = end.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function statusFor(endDate: Date, now: Date = new Date()): { status: DocStatus; daysRemaining: number } {
  const daysRemaining = daysBetween(now, endDate);
  let status: DocStatus;
  if (daysRemaining < 0) {
    status = "expired";
  } else if (daysRemaining <= EXPIRING_THRESHOLD_DAYS) {
    status = "expiring";
  } else {
    status = "valid";
  }
  return { status, daysRemaining };
}
