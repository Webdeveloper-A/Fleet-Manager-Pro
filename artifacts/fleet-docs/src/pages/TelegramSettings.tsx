import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Copy, Loader2, MessageCircle, RefreshCw, Send } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import {
  createTelegramLinkCode,
  disconnectTelegramLink,
  listTelegramLinks,
  type TelegramBotType,
  type TelegramLinkCode,
} from "@/lib/telegram-api";

function botTitle(type: TelegramBotType) {
  return type === "alerts" ? "Bildirishnoma boti" : "Support chat boti";
}

function botDescription(type: TelegramBotType) {
  return type === "alerts"
    ? "Hujjat muddati bo‘yicha Telegram ogohlantirishlarini ushbu kompaniyaga bog‘laydi."
    : "Telegram orqali yuborilgan savollarni Support markaziga bog‘laydi.";
}

function botIcon(type: TelegramBotType) {
  return type === "alerts" ? BellRing : MessageCircle;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function TelegramSettings() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();

  const [codes, setCodes] = useState<Partial<Record<TelegramBotType, TelegramLinkCode>>>({});

  const linksQuery = useQuery({
    queryKey: ["telegram", "links"],
    queryFn: () => listTelegramLinks(token),
    enabled: !!token,
  });

  const createCodeMutation = useMutation({
    mutationFn: (botType: TelegramBotType) => createTelegramLinkCode(token, botType),
    onSuccess: async (data) => {
      setCodes((prev) => ({ ...prev, [data.botType]: data }));

      toast({
        title: "Telegram ulash kodi yaratildi",
        description: "Kodni Telegram botga yuboring. Kod 10 daqiqa amal qiladi.",
      });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Telegram kodi yaratilmadi";
      toast({ title: "Xatolik", description: message, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (botType: TelegramBotType) => disconnectTelegramLink(token, botType),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["telegram", "links"] });
      toast({ title: "Telegram ulanishi o‘chirildi" });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Telegram ulanishi o‘chirilmadi";
      toast({ title: "Xatolik", description: message, variant: "destructive" });
    },
  });

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Nusxa olindi", description: text });
    } catch {
      toast({
        title: "Nusxa olib bo‘lmadi",
        description: "Kodni qo‘lda belgilab nusxa oling.",
        variant: "destructive",
      });
    }
  }

  const links = linksQuery.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Telegram integratsiyasi"
        description="Kompaniyangiz uchun Telegram bildirishnomalari va support chatini ulang."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {(["alerts", "support"] as TelegramBotType[]).map((type) => {
          const Icon = botIcon(type);
          const link = links.find((item) => item.botType === type && item.isActive);
          const code = codes[type];

          return (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-4 w-4" />
                  {botTitle(type)}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  {botDescription(type)}
                </p>

                {linksQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Holat tekshirilmoqda...
                  </div>
                ) : link ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <p className="font-medium">Ulangan</p>
                    <p className="mt-1">
                      Chat:{" "}
                      <span className="font-mono">
                        {link.telegramUsername
                          ? `@${link.telegramUsername}`
                          : link.telegramFirstName || link.telegramChatId}
                      </span>
                    </p>
                    <p className="mt-1 text-xs">Ulangan vaqt: {formatDate(link.linkedAt)}</p>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => disconnectMutation.mutate(type)}
                      disabled={disconnectMutation.isPending}
                    >
                      Ulanishni o‘chirish
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Bu bot hali kompaniyaga ulanmagan.
                  </div>
                )}

                {code ? (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm font-medium">Ulash kodi</p>

                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-sm">
                        {code.startCommand}
                      </code>

                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => copyText(code.startCommand)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      Amal qilish muddati: {formatDate(code.expiresAt)}
                    </p>
                  </div>
                ) : null}

                <Button
                  type="button"
                  className="w-full"
                  onClick={() => createCodeMutation.mutate(type)}
                  disabled={createCodeMutation.isPending}
                >
                  {createCodeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : link ? (
                    <>
                      <RefreshCw className="mr-1 h-4 w-4" />
                      Qayta ulash kodi olish
                    </>
                  ) : (
                    <>
                      <Send className="mr-1 h-4 w-4" />
                      Telegram ulash kodi olish
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}