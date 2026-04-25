import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, AlertTriangle, MinusCircle } from "lucide-react";

export type StatusKind = "valid" | "expiring" | "expired" | "none";

const STYLES: Record<
  StatusKind,
  { label: string; classes: string; Icon: typeof CheckCircle2 }
> = {
  valid: {
    label: "Valid",
    classes:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
    Icon: CheckCircle2,
  },
  expiring: {
    label: "Expiring",
    classes:
      "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
    Icon: Clock,
  },
  expired: {
    label: "Expired",
    classes:
      "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
    Icon: AlertTriangle,
  },
  none: {
    label: "No documents",
    classes:
      "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
    Icon: MinusCircle,
  },
};

export function StatusPill({
  status,
  size = "sm",
  className,
  label,
}: {
  status: StatusKind;
  size?: "xs" | "sm" | "md";
  className?: string;
  label?: string;
}) {
  const config = STYLES[status];
  const Icon = config.Icon;
  const sizing =
    size === "xs"
      ? "px-1.5 py-0.5 text-[10px] gap-1 [&_svg]:h-3 [&_svg]:w-3"
      : size === "md"
      ? "px-3 py-1 text-sm gap-1.5 [&_svg]:h-4 [&_svg]:w-4"
      : "px-2 py-0.5 text-xs gap-1 [&_svg]:h-3.5 [&_svg]:w-3.5";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap",
        sizing,
        config.classes,
        className,
      )}
      data-testid={`status-pill-${status}`}
    >
      <Icon />
      {label ?? config.label}
    </span>
  );
}
