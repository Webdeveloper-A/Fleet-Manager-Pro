import { Link } from "wouter";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useListNotifications,
  getListNotificationsQueryKey,
  type Document,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  FileText,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CalendarClock,
  BellRing,
  Inbox,
  Send,
  MessageCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { sendExpiryAlerts, sendTelegramTest } from "@/lib/telegram-alerts";

export default function Dashboard() {
  const token = useAuth((s) => s.token);
  const { toast } = useToast();
  const [sendingTelegram, setSendingTelegram] = useState(false);

  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });

  const { data: notifData } = useListNotifications({
    query: { queryKey: getListNotificationsQueryKey() },
  });

  async function handleTelegramTest() {
    setSendingTelegram(true);

    try {
      await sendTelegramTest(token);

      toast({
        title: "Telegram test yuborildi",
        description: "Botga test xabar muvaffaqiyatli yuborildi.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Telegram test xatoligi";

      toast({
        title: "Telegram xatolik",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSendingTelegram(false);
    }
  }

  async function handleExpiryAlerts() {
    setSendingTelegram(true);

    try {
      const result = await sendExpiryAlerts(token);

      toast({
        title: "Telegram alert yuborildi",
        description: `${result.documents ?? 0} ta hujjat bo‘yicha xabar yuborildi.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Telegram alert xatoligi";

      toast({
        title: "Telegram xatolik",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSendingTelegram(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Operations overview"
          description="A quick look at fleet health, expiring documents, and active alerts."
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleTelegramTest}
            disabled={sendingTelegram}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="button-telegram-test"
          >
            <MessageCircle className="h-4 w-4" />
            Telegram Test
          </button>

          <button
            type="button"
            onClick={handleExpiryAlerts}
            disabled={sendingTelegram}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="button-send-expiry-alerts"
          >
            <Send className="h-4 w-4" />
            Send Expiry Alerts
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {[
          {
            label: "Vehicles",
            value: summary?.totalVehicles,
            Icon: Truck,
            tone: "primary",
          },
          {
            label: "Documents",
            value: summary?.totalDocuments,
            Icon: FileText,
            tone: "primary",
          },
          {
            label: "Valid",
            value: summary?.validCount,
            Icon: ShieldCheck,
            tone: "emerald",
          },
          {
            label: "Expiring",
            value: summary?.expiringCount,
            Icon: Clock,
            tone: "amber",
          },
          {
            label: "Expired",
            value: summary?.expiredCount,
            Icon: AlertTriangle,
            tone: "rose",
          },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {kpi.label}
                  </p>
                  <div
                    className={
                      kpi.tone === "emerald"
                        ? "rounded-md bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400"
                        : kpi.tone === "amber"
                          ? "rounded-md bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400"
                          : kpi.tone === "rose"
                            ? "rounded-md bg-rose-500/10 p-1.5 text-rose-600"
                            : "rounded-md bg-primary/10 p-1.5 text-primary"
                    }
                  >
                    <kpi.Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  {isLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p
                      className="text-2xl font-semibold tracking-tight"
                      data-testid={`text-kpi-${kpi.label.toLowerCase()}`}
                    >
                      {kpi.value ?? 0}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Upcoming expirations</CardTitle>
              <p className="text-xs text-muted-foreground">Next 15 days</p>
            </div>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <DocListSkeleton />
            ) : !summary || summary.upcomingExpirations.length === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState
                  icon={ShieldCheck}
                  title="All clear"
                  description="No documents expire in the next 15 days."
                />
              </div>
            ) : (
              <DocList docs={summary.upcomingExpirations} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Recently expired</CardTitle>
              <p className="text-xs text-muted-foreground">
                Documents already past their end date
              </p>
            </div>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <DocListSkeleton />
            ) : !summary || summary.recentlyExpired.length === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState
                  icon={ShieldCheck}
                  title="Nothing expired"
                  description="Your fleet is in good standing. Keep it up."
                />
              </div>
            ) : (
              <DocList docs={summary.recentlyExpired} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base font-semibold">Recent alerts</CardTitle>
            <p className="text-xs text-muted-foreground">
              Generated by the expiry monitor as documents approach their end date
            </p>
          </div>
          <BellRing className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {(notifData?.items.length ?? 0) === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No alerts yet"
              description="The expiry monitor runs three times a day. Anything within 10 days of expiry will appear here."
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {notifData!.items.slice(0, 6).map((n, idx) => (
                <motion.li
                  key={n.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-start justify-between gap-4 py-3"
                  data-testid={`alert-${n.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Badge
                      variant="outline"
                      className={
                        n.kind === "expired"
                          ? "border-rose-500/40 text-rose-600"
                          : "border-amber-500/40 text-amber-700"
                      }
                    >
                      {n.kind === "expired" ? "Expired" : "Expiring"}
                    </Badge>
                    <p className="text-sm text-foreground">{n.message}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {format(new Date(n.createdAt), "MMM d")}
                  </span>
                </motion.li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DocList({ docs }: { docs: Document[] }) {
  return (
    <ul className="divide-y divide-border/60">
      {docs.map((d, idx) => (
        <motion.li
          key={d.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.03 }}
        >
          <Link
            href={`/vehicles/${d.vehicleId}`}
            className="flex items-center justify-between gap-4 px-6 py-3 transition-colors hover:bg-muted/40"
            data-testid={`doc-row-${d.id}`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {d.vehicleName ?? "Unknown"}
                {d.vehiclePlateNumber ? ` • ${d.vehiclePlateNumber}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusPill
                status={d.status}
                label={
                  d.status === "expired"
                    ? `Expired ${Math.abs(d.daysRemaining)}d ago`
                    : d.status === "expiring"
                      ? `${d.daysRemaining}d left`
                      : "Valid"
                }
              />
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(d.endDate), "MMM d, yyyy")}
              </span>
            </div>
          </Link>
        </motion.li>
      ))}
    </ul>
  );
}

function DocListSkeleton() {
  return (
    <ul className="divide-y divide-border/60">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </li>
      ))}
    </ul>
  );
}