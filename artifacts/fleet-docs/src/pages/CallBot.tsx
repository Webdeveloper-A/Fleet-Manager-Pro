import { Bot, FileText, Upload, MessageCircle, Table2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n";

export default function CallBot() {
  const t = useT();

  const items = [
    {
      icon: FileText,
      title: t("helpDocuments"),
      text: t("helpDocumentsText"),
    },
    {
      icon: Upload,
      title: t("helpUpload"),
      text: t("helpUploadText"),
    },
    {
      icon: MessageCircle,
      title: t("helpTelegram"),
      text: t("helpTelegramText"),
    },
    {
      icon: Table2,
      title: t("helpReports"),
      text: t("helpReportsText"),
    },
  ];

  return (
    <div>
      <PageHeader title={t("callBotTitle")} description={t("callBotDescription")} />

      <Card className="mb-4">
        <CardContent className="flex gap-4 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Bot className="h-6 w-6" />
          </div>

          <div>
            <p className="text-sm leading-6 text-muted-foreground">{t("callBotIntro")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("quickHelp")}</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-2">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-xl border border-border/70 bg-card p-4 transition-colors hover:bg-muted/40"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold">{item.title}</p>
                </div>

                <p className="text-sm leading-6 text-muted-foreground">{item.text}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}