import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  companiesTable,
  supportMessagesTable,
  supportTicketsTable,
} from "@workspace/db/schema";
import { requireAdmin, requireAuth, requireCompany } from "../middlewares/auth";

const router: IRouter = Router();

const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(255),
  body: z.string().trim().min(3).max(5000),
  priority: z.enum(["low", "normal", "high"]).optional().default("normal"),
});

const createMessageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

const updateStatusSchema = z.object({
  status: z.enum(["open", "pending", "closed"]),
});

function mapTicket(row: {
  id: string;
  companyId: string;
  companyName?: string | null;
  subject: string;
  status: string;
  priority: string;
  createdByEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    companyId: row.companyId,
    companyName: row.companyName ?? null,
    subject: row.subject,
    status: row.status,
    priority: row.priority,
    createdByEmail: row.createdByEmail,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function getTicketForAccess(ticketId: string, req: Request) {
  const [ticket] = await db
    .select({
      id: supportTicketsTable.id,
      companyId: supportTicketsTable.companyId,
      companyName: companiesTable.name,
      subject: supportTicketsTable.subject,
      status: supportTicketsTable.status,
      priority: supportTicketsTable.priority,
      createdByEmail: supportTicketsTable.createdByEmail,
      createdAt: supportTicketsTable.createdAt,
      updatedAt: supportTicketsTable.updatedAt,
    })
    .from(supportTicketsTable)
    .leftJoin(companiesTable, eq(supportTicketsTable.companyId, companiesTable.id))
    .where(eq(supportTicketsTable.id, ticketId))
    .limit(1);

  if (!ticket) return null;

  if (req.principal?.role === "admin") {
    return ticket;
  }

  if (req.principal?.role === "company" && req.principal.companyId === ticket.companyId) {
    return ticket;
  }

  return null;
}

router.get("/support/tickets", requireAuth, async (req: Request, res: Response) => {
  const principal = req.principal!;

  const baseSelect = db
    .select({
      id: supportTicketsTable.id,
      companyId: supportTicketsTable.companyId,
      companyName: companiesTable.name,
      subject: supportTicketsTable.subject,
      status: supportTicketsTable.status,
      priority: supportTicketsTable.priority,
      createdByEmail: supportTicketsTable.createdByEmail,
      createdAt: supportTicketsTable.createdAt,
      updatedAt: supportTicketsTable.updatedAt,
    })
    .from(supportTicketsTable)
    .leftJoin(companiesTable, eq(supportTicketsTable.companyId, companiesTable.id));

  const rows =
    principal.role === "admin"
      ? await baseSelect.orderBy(desc(supportTicketsTable.updatedAt))
      : await baseSelect
          .where(eq(supportTicketsTable.companyId, principal.companyId!))
          .orderBy(desc(supportTicketsTable.updatedAt));

  res.json({ items: rows.map(mapTicket) });
});

router.post(
  "/support/tickets",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    const parsed = createTicketSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid support ticket payload" });
      return;
    }

    const principal = req.principal!;
    const now = new Date();

    const [ticket] = await db
      .insert(supportTicketsTable)
      .values({
        companyId: principal.companyId!,
        subject: parsed.data.subject,
        priority: parsed.data.priority,
        status: "open",
        createdByUserId: principal.id,
        createdByEmail: principal.email,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const [message] = await db
      .insert(supportMessagesTable)
      .values({
        ticketId: ticket.id,
        senderRole: "company",
        senderEmail: principal.email,
        body: parsed.data.body,
        createdAt: now,
      })
      .returning();

    res.status(201).json({
      ticket: mapTicket({
        ...ticket,
        companyName: principal.companyName ?? null,
      }),
      message,
    });
  },
);

router.get("/support/tickets/:id", requireAuth, async (req: Request, res: Response) => {
  const ticket = await getTicketForAccess(req.params.id, req);

  if (!ticket) {
    res.status(404).json({ error: "Support ticket not found" });
    return;
  }

  const messages = await db
    .select()
    .from(supportMessagesTable)
    .where(eq(supportMessagesTable.ticketId, ticket.id))
    .orderBy(supportMessagesTable.createdAt);

  res.json({
    ticket: mapTicket(ticket),
    messages: messages.map((m) => ({
      id: m.id,
      ticketId: m.ticketId,
      senderRole: m.senderRole,
      senderEmail: m.senderEmail,
      body: m.body,
      createdAt: m.createdAt,
    })),
  });
});

router.post("/support/tickets/:id/messages", requireAuth, async (req: Request, res: Response) => {
  const parsed = createMessageSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid message payload" });
    return;
  }

  const ticket = await getTicketForAccess(req.params.id, req);

  if (!ticket) {
    res.status(404).json({ error: "Support ticket not found" });
    return;
  }

  if (ticket.status === "closed" && req.principal?.role !== "admin") {
    res.status(400).json({ error: "Closed ticket cannot be updated by company user" });
    return;
  }

  const principal = req.principal!;
  const now = new Date();
  const senderRole = principal.role === "admin" ? "admin" : "company";

  const [message] = await db
    .insert(supportMessagesTable)
    .values({
      ticketId: ticket.id,
      senderRole,
      senderEmail: principal.email,
      body: parsed.data.body,
      createdAt: now,
    })
    .returning();

  await db
    .update(supportTicketsTable)
    .set({
      updatedAt: now,
      status: senderRole === "admin" ? "pending" : "open",
    })
    .where(eq(supportTicketsTable.id, ticket.id));

  res.status(201).json({
    id: message.id,
    ticketId: message.ticketId,
    senderRole: message.senderRole,
    senderEmail: message.senderEmail,
    body: message.body,
    createdAt: message.createdAt,
  });
});

router.patch(
  "/support/tickets/:id/status",
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = updateStatusSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid support ticket status" });
      return;
    }

    const ticket = await getTicketForAccess(req.params.id, req);

    if (!ticket) {
      res.status(404).json({ error: "Support ticket not found" });
      return;
    }

    const [updated] = await db
      .update(supportTicketsTable)
      .set({
        status: parsed.data.status,
        updatedAt: new Date(),
      })
      .where(eq(supportTicketsTable.id, ticket.id))
      .returning();

    res.json({
      ticket: mapTicket({
        ...updated,
        companyName: ticket.companyName,
      }),
    });
  },
);

export default router;