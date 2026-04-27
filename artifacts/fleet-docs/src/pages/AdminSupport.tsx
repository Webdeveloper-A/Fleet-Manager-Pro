import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import {
  getSupportTicket,
  listSupportTickets,
  sendSupportMessage,
  updateSupportTicketStatus,
  type SupportTicket,
  type SupportTicketStatus,
} from "@/lib/support-api";

function statusBadge(status: string) {
  const base = "rounded-full px-2 py-0.5 text-[11px] font-medium";

  if (status === "closed") return `${base} bg-slate-100 text-slate-700`;
  if (status === "pending") return `${base} bg-amber-100 text-amber-700`;
  return `${base} bg-emerald-100 text-emerald-700`;
}

function statusLabel(status: string) {
  if (status === "closed") return "Yopilgan";
  if (status === "pending") return "Javob berilgan";
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

export default function AdminSupport() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const ticketsQuery = useQuery({
    queryKey: ["admin", "support", "tickets"],
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
    queryKey: ["admin", "support", "tickets", selectedTicketId],
    queryFn: () => getSupportTicket(token, selectedTicketId!),
    enabled: !!token && !!selectedTicketId,
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: () => sendSupportMessage(token, selectedTicketId!, reply),
    onSuccess: async () => {
      setReply("");
      await qc.invalidateQueries({ queryKey: ["admin", "support", "tickets"] });
      await qc.invalidateQueries({ queryKey: ["admin", "support", "tickets", selectedTicketId] });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Javob yuborilmadi";
      toast({ title: "Xatolik", description: message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: SupportTicketStatus) =>
      updateSupportTicketStatus(token, selectedTicketId!, status),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "support", "tickets"] });
      await qc.invalidateQueries({ queryKey: ["admin", "support", "tickets", selectedTicketId] });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Murojaat holati o‘zgartirilmadi";
      toast({ title: "Xatolik", description: message, variant: "destructive" });
    },
  });

  function handleSend(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedTicketId || !reply.trim()) return;

    sendMutation.mutate();
  }

  const selectedTicket = detailQuery.data?.ticket;
  const messages = detailQuery.data?.messages ?? [];

  return (
    <div>
      <PageHeader
        title="Support boshqaruvi"
        description="Mijoz murojaatlarini ko‘rib chiqish, javob berish va holatini boshqarish."
      />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" />
              Murojaatlar
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
                  data-testid={`button-admin-support-ticket-${ticket.id}`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-medium">{ticket.subject}</p>
                    <span className={statusBadge(ticket.status)}>
                      {statusLabel(ticket.status)}
                    </span>
                  </div>

                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {ticket.companyName || "Kompaniya"} •{" "}
                    {ticket.createdByEmail || "Email ko‘rsatilmagan"}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Oxirgi yangilanish: {formatDate(ticket.updatedAt)}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[640px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4" />
              {selectedTicket ? selectedTicket.subject : "Murojaatni tanlang"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {!selectedTicketId ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Ko‘rib chiqish uchun chap tomondan murojaatni tanlang.
              </div>
            ) : detailQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Suhbat yuklanmoqda...
              </div>
            ) : (
              <div className="flex min-h-[540px] flex-col">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={statusBadge(selectedTicket?.status ?? "open")}>
                        {statusLabel(selectedTicket?.status ?? "open")}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        Muhimlik: {priorityLabel(selectedTicket?.priority)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {selectedTicket?.companyName || "Kompaniya"} •{" "}
                      {selectedTicket?.createdByEmail || "Email ko‘rsatilmagan"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => statusMutation.mutate("open")}
                      disabled={statusMutation.isPending}
                    >
                      Ko‘rib chiqilmoqda
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => statusMutation.mutate("pending")}
                      disabled={statusMutation.isPending}
                    >
                      Javob berildi
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => statusMutation.mutate("closed")}
                      disabled={statusMutation.isPending}
                    >
                      Yopish
                    </Button>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border bg-muted/20 p-3">
                  {messages.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">
                      Ushbu murojaat bo‘yicha hali xabarlar mavjud emas.
                    </p>
                  ) : (
                    messages.map((m) => {
                      const isAdmin = m.senderRole === "admin";

                      return (
                        <div
                          key={m.id}
                          className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm ${
                              isAdmin
                                ? "bg-primary text-primary-foreground"
                                : "border bg-card text-foreground"
                            }`}
                          >
                            <div className="mb-1 text-[11px] opacity-75">
                              {isAdmin ? "Support mutaxassisi" : m.senderEmail || "Mijoz"} •{" "}
                              {formatDate(m.createdAt)}
                            </div>
                            <p className="whitespace-pre-wrap leading-6">{m.body}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSend} className="mt-4 flex gap-2">
                  <Input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Javob yozing..."
                    data-testid="input-admin-support-reply"
                  />

                  <Button
                    type="submit"
                    disabled={sendMutation.isPending || !reply.trim()}
                    data-testid="button-admin-send-support-message"
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}