import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import {
  useListNotifications,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { Bell, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProfileMenu } from "@/components/ProfileMenu";
import { format } from "date-fns";

export function Topbar() {
  const { principal } = useAuth();
  const t = useT();

  const isCompany = principal?.role === "company";

  const { data } = useListNotifications({
    query: {
      enabled: !!principal && isCompany,
      queryKey: getListNotificationsQueryKey(),
    },
  });

  const items = data?.items ?? [];
  const unread = items.length;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70 text-primary-foreground md:hidden">
          <ShieldCheck className="h-4 w-4" />
        </div>

        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-foreground">
            {principal?.companyName ?? (principal?.role === "admin" ? t("adminConsole") : t("appName"))}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {principal?.role === "admin" ? t("platformAdministrator") : t("vehicleDocumentManagement")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isCompany ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                data-testid="button-notifications"
              >
                <Bell className="h-4 w-4" />
                {unread > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-80 p-0">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold">{t("notifications")}</p>
                <p className="text-xs text-muted-foreground">{t("notificationsDescription")}</p>
              </div>

              <ScrollArea className="max-h-80">
                {items.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {t("noNotifications")}
                  </p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {items.slice(0, 12).map((n) => (
                      <li key={n.id} className="px-4 py-3" data-testid={`notification-${n.id}`}>
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant="outline"
                            className={
                              n.kind === "expired"
                                ? "border-rose-500/40 text-rose-600"
                                : "border-amber-500/40 text-amber-700"
                            }
                          >
                            {n.kind === "expired" ? t("expired") : t("expiring")}
                          </Badge>

                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(n.createdAt), "MMM d")}
                          </span>
                        </div>

                        <p className="mt-1.5 text-sm text-foreground">{n.message}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        ) : null}

        <ProfileMenu />
      </div>
    </header>
  );
}