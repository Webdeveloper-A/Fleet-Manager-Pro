import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Headphones, Loader2, MessageCircle, Plus, Send, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import {
  createSupportTicket,
  getSupportTicket,
  listSupportTickets,
  sendSupportMessage,
  type SupportPriority,
  type SupportTicket,
} from "@/lib/support-api";

function statusBadge(status: string) {
  const base = "rounded-full px-2 py-0.5 text-[11px] font-medium";

  if (status === "closed") return `${base} bg-slate-100 text-slate-700`;
  if (status === "pending") return `${base} bg-amber-100 text-amber-700`;
  return `${base} bg-emerald-100 text-emerald-700`;
}

function statusLabel(status: string) {
  if (status === "closed") return "Yopilgan";
  if (status === "pending") return "Javob berildi";
  return "Ko‘rib chiqilmoqda";
}

function priorityLabel(priority?: string | null) {
  if (priority === "high") return "Yuqori";
  if (priority === "low") return "Past";
  return "Oddiy";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function CallBot() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<SupportPriority>("normal");
  const [reply, setReply] = useState("");

  const ticketsQuery = useQuery({
    queryKey: ["support", "tickets"],
    queryFn: () => listSupportTickets(token),
    enabled: !!token,
    refetchInterval: 5000,
  });

  const tickets = ticketsQuery.data?.items ?? [];

  useEffect(() => {
    if (!selectedTicketId && tickets.length > 0) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  const detailQuery = useQuery({
    queryKey: ["support", "tickets", selectedTicketId],
    queryFn: () => getSupportTicket(token, selectedTicketId!),
    enabled: !!token && !!selectedTicketId,
    refetchInterval: 3000,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createSupportTicket(token, {
        subject,
        body,
        priority,
      }),
    onSuccess: async (res) => {
      setSubject("");
      setBody("");
      setPriority("normal");
      setSelectedTicketId(res.ticket.id);

      await qc.invalidateQueries({ queryKey: ["support", "tickets"] });
      await qc.invalidateQueries({ queryKey: ["support", "tickets", res.ticket.id] });

      toast({
        title: "Murojaat yuborildi",
        description: "Murojaatingiz qabul qilindi. Javoblar ushbu suhbat oynasida aks etadi.",
      });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Murojaat yuborilmadi";
      toast({ title: "Xatolik", description: message, variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: () => sendSupportMessage(token, selectedTicketId!, reply),
    onSuccess: async () => {
      setReply("");
      await qc.invalidateQueries({ queryKey: ["support", "tickets"] });
      await qc.invalidateQueries({ queryKey: ["support", "tickets", selectedTicketId] });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Xabar yuborilmadi";
      toast({ title: "Xatolik", description: message, variant: "destructive" });
    },
  });

  function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();

    if (subject.trim().length < 3 || body.trim().length < 3) {
      toast({
        title: "Ma’lumot yetarli emas",
        description: "Mavzu va murojaat matni kamida 3 ta belgidan iborat bo‘lishi kerak.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate();
  }

  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedTicketId || reply.trim().length < 1) return;

    sendMutation.mutate();
  }

  const selectedTicket = detailQuery.data?.ticket;
  const messages = detailQuery.data?.messages ?? [];

  return (
    <div>
      <PageHeader
        title="Mijozlarni qo‘llab-quvvatlash markazi"
        description="Platforma bo‘yicha savol, texnik muammo yoki takliflaringizni mas’ul mutaxassislarga yuboring."
      />

      <Card className="mb-4">
        <CardContent className="flex gap-4 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Headphones className="h-6 w-6" />
          </div>

          <div>
            <p className="text-sm leading-6 text-muted-foreground">
              Murojaatlaringiz support tizimida qayd etiladi. Mas’ul mutaxassislar javoblari
              ushbu sahifada aks etadi va suhbat tarixi saqlanadi.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="h-4 w-4" />
                Yangi murojaat yaratish
              </CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleCreateTicket} className="space-y-3">
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Masalan: Hujjat yuklashda xatolik"
                  data-testid="input-support-subject"
                />

                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as SupportPriority)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  data-testid="select-support-priority"
                >
                  <option value="low">Past muhimlik</option>
                  <option value="normal">Oddiy muhimlik</option>
                  <option value="high">Yuqori muhimlik</option>
                </select>

                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Murojaatingizni batafsil yozing..."
                  rows={5}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  data-testid="textarea-support-body"
                />

                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full"
                  data-testid="button-create-support-ticket"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Murojaat yuborish"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4" />
                Murojaatlar tarixi
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-2">
              {ticketsQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Murojaatlar yuklanmoqda...
                </div>
              ) : tickets.length === 0 ? (
                <p className="text-sm text-muted-foreground">Hozircha murojaatlar mavjud emas.</p>
              ) : (
                tickets.map((ticket: SupportTicket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedTicketId === ticket.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40"
                    }`}
                    data-testid={`button-support-ticket-${ticket.id}`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-medium">{ticket.subject}</p>
                      <span className={statusBadge(ticket.status)}>
                        {statusLabel(ticket.status)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Oxirgi yangilanish: {formatDate(ticket.updatedAt)}
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="min-h-[560px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4" />
              {selectedTicket ? selectedTicket.subject : "Murojaatni tanlang"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {!selectedTicketId ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Suhbatni davom ettirish uchun mavjud murojaatni tanlang yoki yangi murojaat
                yarating.
              </div>
            ) : detailQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Suhbat yuklanmoqda...
              </div>
            ) : (
              <div className="flex min-h-[460px] flex-col">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className={statusBadge(selectedTicket?.status ?? "open")}>
                    {statusLabel(selectedTicket?.status ?? "open")}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    Muhimlik: {priorityLabel(selectedTicket?.priority)}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border bg-muted/20 p-3">
                  {messages.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">
                      Ushbu murojaat bo‘yicha hali xabarlar mavjud emas.
                    </p>
                  ) : (
                    messages.map((m) => {
                      const isMine = m.senderRole === "company";

                      return (
                        <div
                          key={m.id}
                          className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm ${
                              isMine
                                ? "bg-primary text-primary-foreground"
                                : "border bg-card text-foreground"
                            }`}
                          >
                            <div className="mb-1 text-[11px] opacity-75">
                              {m.senderRole === "admin" ? "Support mutaxassisi" : "Siz"} •{" "}
                              {formatDate(m.createdAt)}
                            </div>
                            <p className="whitespace-pre-wrap leading-6">{m.body}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedTicket?.status === "closed" ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    Ushbu murojaat yopilgan. Yangi savol yoki muammo bo‘lsa, alohida murojaat
                    yarating.
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                    <Input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Xabar yozing..."
                      data-testid="input-support-reply"
                    />

                    <Button
                      type="submit"
                      disabled={sendMutation.isPending || !reply.trim()}
                      data-testid="button-send-support-message"
                    >
                      {sendMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}