import { useLocation } from "wouter";
import {
  Building2,
  ChevronDown,
  Languages,
  LogOut,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Monitor,
  Bot,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePreferences, type Language, type Theme } from "@/lib/preferences";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGUAGES: Array<{ value: Language; label: string }> = [
  { value: "uz", label: "O‘zbek" },
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
];

const THEMES: Array<{ value: Theme; labelKey: "light" | "dark" | "system"; icon: typeof Sun }> = [
  { value: "light", labelKey: "light", icon: Sun },
  { value: "dark", labelKey: "dark", icon: Moon },
  { value: "system", labelKey: "system", icon: Monitor },
];

export function ProfileMenu() {
  const { principal, logout } = useAuth();
  const [, setLocation] = useLocation();
  const t = useT();

  const language = usePreferences((s) => s.language);
  const theme = usePreferences((s) => s.theme);
  const setLanguage = usePreferences((s) => s.setLanguage);
  const setTheme = usePreferences((s) => s.setTheme);

  function handleLogout() {
    logout();
    setLocation("/login");
  }

  function openCallBot() {
    setLocation("/call-bot");
  }

  function openProfile() {
    setLocation("/profile");
  }

  return (
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

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div>
            <p className="text-sm font-semibold">{principal?.companyName ?? t("adminConsole")}</p>
            <p className="text-xs font-normal text-muted-foreground">{principal?.email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={openProfile}>
          <Settings className="mr-2 h-4 w-4" />
          {t("profileSettings")}
        </DropdownMenuItem>

        {principal?.role === "company" ? (
          <DropdownMenuItem onClick={openCallBot}>
            <Bot className="mr-2 h-4 w-4" />
            {t("openCallBot")}
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Languages className="mr-2 h-4 w-4" />
            {t("language")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {LANGUAGES.map((item) => (
              <DropdownMenuItem
                key={item.value}
                onClick={() => setLanguage(item.value)}
                className={language === item.value ? "font-semibold text-primary" : ""}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Moon className="mr-2 h-4 w-4" />
            {t("theme")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {THEMES.map((item) => {
              const Icon = item.icon;

              return (
                <DropdownMenuItem
                  key={item.value}
                  onClick={() => setTheme(item.value)}
                  className={theme === item.value ? "font-semibold text-primary" : ""}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {t(item.labelKey)}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
          <LogOut className="mr-2 h-4 w-4" />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}