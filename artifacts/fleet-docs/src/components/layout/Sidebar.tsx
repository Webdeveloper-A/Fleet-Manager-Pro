import { Link, useLocation } from "wouter";
import { Home, Truck, FileText, Building2, ShieldCheck, Bot, LifeBuoy, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useT, type TranslationKey } from "@/lib/i18n";

type Role = "company" | "admin";

const NAV = [
  { href: "/", labelKey: "dashboard", icon: Home, roles: ["company"] as const },
  { href: "/vehicles", labelKey: "vehicles", icon: Truck, roles: ["company"] as const },
  { href: "/documents", labelKey: "documents", icon: FileText, roles: ["company"] as const },
  { href: "/telegram", labelKey: "telegram", icon: Send, roles: ["company"] as const },
  { href: "/call-bot", labelKey: "callBot", icon: Bot, roles: ["company"] as const },
  {
    href: "/admin/support",
    labelKey: "support",
    icon: LifeBuoy,
    roles: ["admin"] as const,
  },
  {
    href: "/admin/companies",
    labelKey: "companies",
    icon: Building2,
    roles: ["admin"] as const,
  },
] satisfies Array<{
  href: string;
  labelKey: TranslationKey;
  icon: typeof Home;
  roles: readonly Role[];
}>;

export function Sidebar() {
  const [location] = useLocation();
  const { principal } = useAuth();
  const t = useT();

  const role: Role = principal?.role === "admin" ? "admin" : "company";
  const items = NAV.filter((n) => n.roles.includes(role));

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden border-r border-border/60 bg-sidebar md:flex md:w-64 md:flex-col"
      data-testid="sidebar"
    >
      <div className="flex h-16 items-center gap-2 border-b border-border/60 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
          <ShieldCheck className="h-5 w-5" />
        </div>

        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">{t("appName")}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("appSubtitle")}
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? location === "/"
              : location === item.href || location.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`link-nav-${item.labelKey}`}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/60 px-6 py-4 text-xs text-muted-foreground">
        {t("signedInAs")}
        <p className="mt-0.5 truncate text-foreground" data-testid="text-sidebar-email">
          {principal?.email}
        </p>
      </div>
    </aside>
  );
}