import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusPillVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      status: {
        valid: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
        expiring: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
        expired: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
        none: "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/20",
      },
    },
    defaultVariants: {
      status: "none",
    },
  }
);

export interface StatusPillProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof statusPillVariants> {
  label?: string;
}

export function StatusPill({ className, status, label, ...props }: StatusPillProps) {
  const displayLabel = label || (status ? status.charAt(0).toUpperCase() + status.slice(1) : "None");
  return (
    <div className={cn(statusPillVariants({ status }), className)} {...props}>
      {status === 'valid' && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />}
      {status === 'expiring' && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />}
      {status === 'expired' && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden="true" />}
      {status === 'none' && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden="true" />}
      {displayLabel}
    </div>
  );
}
