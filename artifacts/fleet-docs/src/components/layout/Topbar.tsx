import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  useListNotifications,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { Bell, LogOut, ShieldCheck, Building2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

export function Topbar() {
  const { principal, logout } = useAuth();
  const [, setLocation] = useLocation();

  const isCompany = principal?.role === "company";
  const { data } = useListNotifications({
    query: {
      enabled: !!principal && isCompany,
      queryKey: getListNotificationsQueryKey(),
    },
  });

  const items = data?.items ?? [];
  const unread = items.length;

  function handleLogout() {
    logout();
    setLocation("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <div className="md:hidden flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-foreground">
            {principal?.companyName ?? (principal?.role === "admin" ? "Admin Console" : "Fleet Docs")}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {principal?.role === "admin" ? "Platform administrator" : "Vehicle & document management"}
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
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold">Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Document expiry alerts for your fleet
                </p>
              </div>
              <ScrollArea className="max-h-80">
                {items.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No notifications yet.
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
                            {n.kind === "expired" ? "Expired" : "Expiring"}
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2" data-testid="button-user-menu">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                {principal?.role === "admin" ? (
                  <ShieldCheck className="h-4 w-4" />
                ) : (
                  <Building2 className="h-4 w-4" />
                )}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-medium text-foreground">{principal?.email}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {principal?.role}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="text-sm font-semibold">{principal?.companyName ?? "Admin"}</p>
                <p className="text-xs font-normal text-muted-foreground">{principal?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
