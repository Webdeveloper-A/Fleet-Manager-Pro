import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { usePreferences } from "@/lib/preferences";
import { useT } from "@/lib/i18n";

export default function Profile() {
  const { principal } = useAuth();
  const language = usePreferences((s) => s.language);
  const theme = usePreferences((s) => s.theme);
  const t = useT();

  return (
    <div>
      <PageHeader title={t("profileSettings")} description={t("profileSettingsHint")} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("profile")}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-1">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{principal?.email}</span>
          </div>

          <div className="grid gap-1">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium">{principal?.role}</span>
          </div>

          <div className="grid gap-1">
            <span className="text-muted-foreground">Company</span>
            <span className="font-medium">{principal?.companyName ?? "-"}</span>
          </div>

          <div className="grid gap-1">
            <span className="text-muted-foreground">{t("language")}</span>
            <span className="font-medium">{language}</span>
          </div>

          <div className="grid gap-1">
            <span className="text-muted-foreground">{t("theme")}</span>
            <span className="font-medium">{theme}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}