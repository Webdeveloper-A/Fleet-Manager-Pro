import { Link, useLocation } from "wouter";
import { Home, Truck, FileText, Building2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Dashboard", icon: Home, roles: ["company"] as const },
  { href: "/vehicles", label: "Vehicles", icon: Truck, roles: ["company"] as const },
  { href: "/documents", label: "Documents", icon: FileText, roles: ["company"] as const },
  {
    href: "/admin/companies",
    label: "Companies",
    icon: Building2,
    roles: ["admin"] as const,
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const { principal } = useAuth();
  const role = principal?.role ?? "company";

  const items = NAV.filter((n) => (n.roles as readonly string[]).includes(role));

  return (
    <aside
      className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:left-0 z-30 border-r border-border/60 bg-sidebar"
      data-testid="sidebar"
    >
      <div className="flex h-16 items-center gap-2 border-b border-border/60 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">Fleet Docs</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Operations cockpit
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
              data-testid={`link-nav-${item.label.toLowerCase()}`}
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
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border/60 px-6 py-4 text-xs text-muted-foreground">
        Signed in as
        <p className="mt-0.5 truncate text-foreground" data-testid="text-sidebar-email">
          {principal?.email}
        </p>
      </div>
    </aside>
  );
}
