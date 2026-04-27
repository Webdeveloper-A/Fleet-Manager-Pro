export type SupportTicketStatus = "open" | "pending" | "closed";
export type SupportPriority = "low" | "normal" | "high";

export type SupportTicket = {
  id: string;
  companyId: string;
  companyName?: string | null;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportPriority;
  createdByEmail?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupportMessage = {
  id: string;
  ticketId: string;
  senderRole: "company" | "admin" | string;
  senderEmail?: string | null;
  body: string;
  createdAt: string;
};

async function apiRequest<T>(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed with ${res.status}`;

    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore json parse error
    }

    throw new Error(message);
  }

  return (await res.json()) as T;
}

export function listSupportTickets(token: string | null) {
  return apiRequest<{ items: SupportTicket[] }>("/api/support/tickets", token);
}

export function createSupportTicket(
  token: string | null,
  data: {
    subject: string;
    body: string;
    priority: SupportPriority;
  },
) {
  return apiRequest<{ ticket: SupportTicket; message: SupportMessage }>(
    "/api/support/tickets",
    token,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export function getSupportTicket(token: string | null, ticketId: string) {
  return apiRequest<{ ticket: SupportTicket; messages: SupportMessage[] }>(
    `/api/support/tickets/${ticketId}`,
    token,
  );
}

export function sendSupportMessage(token: string | null, ticketId: string, body: string) {
  return apiRequest<SupportMessage>(`/api/support/tickets/${ticketId}/messages`, token, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function updateSupportTicketStatus(
  token: string | null,
  ticketId: string,
  status: SupportTicketStatus,
) {
  return apiRequest<{ ticket: SupportTicket }>(`/api/support/tickets/${ticketId}/status`, token, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}