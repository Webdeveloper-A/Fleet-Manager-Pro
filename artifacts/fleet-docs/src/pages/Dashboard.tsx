import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  FileText,
  Loader2,
  MessageCircle,
  Send,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useT, type TranslationKey } from "@/lib/i18n";
import {
  dateLabel,
  daysLeft,
  getDocumentExpiry,
  loadOperationsData,
  type DazvolItem,
  type DocumentItem,
  type TirCarnetItem,
} from "@/lib/operations-api";

type ExpiryItem = {
  id: string;
  typeKey: TranslationKey;
  title: string;
  transport: string;
  expiryDate: string | null;
};

type DashboardAction = "telegram-test" | "expiry-alerts";

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: "blue" | "green" | "amber" | "red";
}) {
  const toneClass = {
    blue: "bg-sky-500/10 text-sky-400",
    green: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
    red: "bg-rose-500/10 text-rose-400",
  }[tone];

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-3 text-3xl font-bold">{value}</p>
        </div>

        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function itemTitle(item: DocumentItem) {
  return item.title || item.name || item.documentType || item.type || "Hujjat";
}

function itemTransport(item: {
  vehicleName?: string | null;
  vehiclePlateNumber?: string | null;
}) {
  if (item.vehicleName && item.vehiclePlateNumber) {
    return `${item.vehicleName} • ${item.vehiclePlateNumber}`;
  }

  return item.vehicleName || item.vehiclePlateNumber || "—";
}

function documentToExpiryItem(item: DocumentItem): ExpiryItem {
  return {
    id: `document-${item.id}`,
    typeKey: "dashboardTypeDocument",
    title: itemTitle(item),
    transport: itemTransport(item),
    expiryDate: getDocumentExpiry(item),
  };
}

function tirToExpiryItem(item: TirCarnetItem): ExpiryItem {
  return {
    id: `tir-${item.id}`,
    typeKey: "dashboardTypeTir",
    title: item.carnetNumber,
    transport: itemTransport(item),
    expiryDate: item.expiryDate ?? null,
  };
}

function dazvolToExpiryItem(item: DazvolItem): ExpiryItem {
  return {
    id: `dazvol-${item.id}`,
    typeKey: "dashboardTypeDazvol",
    title: item.permitNumber,
    transport: itemTransport(item),
    expiryDate: item.expiryDate ?? null,
  };
}

function expiryBadgeClass(expiryDate?: string | null) {
  const days = daysLeft(expiryDate);

  if (days === null) return "bg-slate-100 text-slate-700";
  if (days < 0) return "bg-rose-100 text-rose-700";
  if (days <= 7) return "bg-orange-100 text-orange-700";
  if (days <= 30) return "bg-amber-100 text-amber-700";

  return "bg-emerald-100 text-emerald-700";
}

function expiryText(expiryDate: string | null, t: (key: TranslationKey) => string) {
  const days = daysLeft(expiryDate);

  if (days === null) return t("dashboardNoExpiryDate");
  if (days < 0) return `${Math.abs(days)} ${t("dashboardDaysExpired")}`;
  if (days === 0) return t("dashboardExpiresToday");

  return `${days} ${t("dashboardDaysLeft")}`;
}

async function postDashboardAction(path: string, token: string | null) {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
}

export default function Dashboard() {
  const token = useAuth((s) => s.token);
  const t = useT();
  const [busyAction, setBusyAction] = useState<DashboardAction | null>(null);

  const query = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => loadOperationsData(token),
    enabled: !!token,
  });

  const dashboard = useMemo(() => {
    const vehicles = query.data?.vehicles ?? [];
    const documents = query.data?.documents ?? [];
    const tirCarnets = query.data?.tirCarnets ?? [];
    const dazvols = query.data?.dazvols ?? [];

    const expiryItems: ExpiryItem[] = [
      ...documents.map(documentToExpiryItem),
      ...tirCarnets.map(tirToExpiryItem),
      ...dazvols.map(dazvolToExpiryItem),
    ];

    const valid = expiryItems.filter((item) => {
      const days = daysLeft(item.expiryDate);
      return days !== null && days > 15;
    });

    const expiring = expiryItems
      .filter((item) => {
        const days = daysLeft(item.expiryDate);
        return days !== null && days >= 0 && days <= 15;
      })
      .sort((a, b) => (daysLeft(a.expiryDate) ?? 9999) - (daysLeft(b.expiryDate) ?? 9999));

    const expired = expiryItems
      .filter((item) => {
        const days = daysLeft(item.expiryDate);
        return days !== null && days < 0;
      })
      .sort((a, b) => (daysLeft(b.expiryDate) ?? -9999) - (daysLeft(a.expiryDate) ?? -9999));

    const unassignedTir = tirCarnets.filter((item) => !item.vehicleId);
    const unassignedDazvols = dazvols.filter((item) => !item.vehicleId);

    return {
      vehiclesCount: vehicles.length,
      documentsCount: documents.length,
      validCount: valid.length,
      expiringCount: expiring.length,
      expiredCount: expired.length,
      expiring,
      expired,
      unassignedTir,
      unassignedDazvols,
    };
  }, [query.data]);

  async function handleTelegramTest() {
    try {
      setBusyAction("telegram-test");
      await postDashboardAction("/api/notifications/send-telegram-test", token);
      toast({ title: t("dashboardTelegramTestSuccess") });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("dashboardTelegramTestFailed");
      toast({
        title: t("dashboardActionError"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSendExpiryAlerts() {
    try {
      setBusyAction("expiry-alerts");
      await postDashboardAction("/api/notifications/send-expiry-alerts", token);
      toast({ title: t("dashboardExpiryAlertsSuccess") });
      await query.refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("dashboardExpiryAlertsFailed");
      toast({
        title: t("dashboardActionError"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setBusyAction(null);
    }
  }

  if (query.isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        {t("dashboardLoadError")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("dashboardOverviewTitle")}</h1>
          <p className="mt-2 text-muted-foreground">{t("dashboardOverviewDescription")}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleTelegramTest} disabled={busyAction !== null}>
            {busyAction === "telegram-test" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="mr-2 h-4 w-4" />
            )}
            {t("dashboardTelegramTest")}
          </Button>

          <Button onClick={handleSendExpiryAlerts} disabled={busyAction !== null}>
            {busyAction === "expiry-alerts" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {t("dashboardSendExpiryAlerts")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label={t("dashboardVehicles")}
          value={dashboard.vehiclesCount}
          icon={Truck}
          tone="blue"
        />
        <StatCard
          label={t("dashboardDocuments")}
          value={dashboard.documentsCount}
          icon={FileText}
          tone="blue"
        />
        <StatCard
          label={t("dashboardValid")}
          value={dashboard.validCount}
          icon={ShieldCheck}
          tone="green"
        />
        <StatCard
          label={t("dashboardExpiring")}
          value={dashboard.expiringCount}
          icon={CalendarClock}
          tone="amber"
        />
        <StatCard
          label={t("dashboardExpired")}
          value={dashboard.expiredCount}
          icon={AlertTriangle}
          tone="red"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{t("dashboardUpcomingExpirations")}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("dashboardNext15Days")}
                </p>
              </div>
              <CalendarClock className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {dashboard.expiring.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                {t("dashboardNoUpcomingExpirations")}
              </p>
            ) : (
              <div className="divide-y">
                {dashboard.expiring.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 px-6 py-4">
                    <div className="min-w-0">
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t(item.typeKey)} · {item.transport}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${expiryBadgeClass(
                          item.expiryDate,
                        )}`}
                      >
                        {expiryText(item.expiryDate, t)}
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {dateLabel(item.expiryDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{t("dashboardRecentlyExpired")}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("dashboardExpiredDescription")}
                </p>
              </div>
              <AlertTriangle className="h-5 w-5 text-rose-500" />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {dashboard.expired.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                {t("dashboardNoExpiredItems")}
              </p>
            ) : (
              <div className="divide-y">
                {dashboard.expired.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 px-6 py-4">
                    <div className="min-w-0">
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t(item.typeKey)} · {item.transport}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${expiryBadgeClass(
                          item.expiryDate,
                        )}`}
                      >
                        {expiryText(item.expiryDate, t)}
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {dateLabel(item.expiryDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{t("dashboardRecentAlerts")}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("dashboardRecentAlertsDescription")}
              </p>
            </div>
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">{t("dashboardAlertExpiring")}</p>
              <p className="mt-2 text-2xl font-bold">{dashboard.expiringCount}</p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">{t("dashboardAlertExpired")}</p>
              <p className="mt-2 text-2xl font-bold">{dashboard.expiredCount}</p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">{t("dashboardUnassignedTir")}</p>
              <p className="mt-2 text-2xl font-bold">{dashboard.unassignedTir.length}</p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">{t("dashboardUnassignedDazvol")}</p>
              <p className="mt-2 text-2xl font-bold">{dashboard.unassignedDazvols.length}</p>
            </div>
          </div>

          {dashboard.expiringCount === 0 &&
          dashboard.expiredCount === 0 &&
          dashboard.unassignedTir.length === 0 &&
          dashboard.unassignedDazvols.length === 0 ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border bg-emerald-50 p-4 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm font-medium">{t("dashboardEverythingOk")}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}