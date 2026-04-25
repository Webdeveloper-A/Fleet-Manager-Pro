import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable, companiesTable, vehiclesTable } from "@workspace/db/schema";
import { eq, ilike, sql, desc } from "drizzle-orm";
import {
  ListCompaniesQueryParams,
  ListCompaniesResponse,
  CreateCompanyBody,
  DeleteCompanyParams,
} from "@workspace/api-zod";
import { hashPassword } from "../lib/auth";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get(
  "/companies",
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = ListCompaniesQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query params" });
      return;
    }
    const { search, page = 1, pageSize = 20 } = parsed.data;
    const offset = (page - 1) * pageSize;

    const where = search
      ? ilike(companiesTable.name, `%${search}%`)
      : undefined;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companiesTable)
      .where(where as never);

    const rows = await db
      .select({
        id: companiesTable.id,
        name: companiesTable.name,
        contactName: companiesTable.contactName,
        phone: companiesTable.phone,
        createdAt: companiesTable.createdAt,
        email: usersTable.email,
        vehicleCount: sql<number>`(select count(*)::int from ${vehiclesTable} where ${vehiclesTable.companyId} = ${companiesTable.id})`,
      })
      .from(companiesTable)
      .leftJoin(
        usersTable,
        sql`${usersTable.companyId} = ${companiesTable.id} and ${usersTable.role} = 'company'`,
      )
      .where(where as never)
      .orderBy(desc(companiesTable.createdAt))
      .limit(pageSize)
      .offset(offset);

    res.json(
      ListCompaniesResponse.parse({
        items: rows.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email ?? "",
          contactName: r.contactName,
          phone: r.phone,
          createdAt: r.createdAt,
          vehicleCount: r.vehicleCount ?? 0,
        })),
        total: count,
        page,
        pageSize,
      }),
    );
  },
);

router.post(
  "/companies",
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = CreateCompanyBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid company payload" });
      return;
    }
    const { name, email, password, contactName, phone } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Email is already registered" });
      return;
    }

    const passwordHash = await hashPassword(password);

    const [company] = await db
      .insert(companiesTable)
      .values({
        name,
        contactName: contactName ?? null,
        phone: phone ?? null,
      })
      .returning();

    await db.insert(usersTable).values({
      email: normalizedEmail,
      passwordHash,
      role: "company",
      companyId: company.id,
    });

    res.status(201).json({
      id: company.id,
      name: company.name,
      email: normalizedEmail,
      contactName: company.contactName,
      phone: company.phone,
      createdAt: company.createdAt,
      vehicleCount: 0,
    });
  },
);

router.delete(
  "/companies/:id",
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = DeleteCompanyParams.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(companiesTable).where(eq(companiesTable.id, parsed.data.id));
    res.status(204).end();
  },
);

export default router;
