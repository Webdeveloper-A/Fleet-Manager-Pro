import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable, companiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { LoginBody, LoginResponse, GetMeResponse } from "@workspace/api-zod";
import { signToken, verifyPassword } from "../lib/auth";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req: Request, res: Response) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid login payload" });
    return;
  }

  const { email, password } = parsed.data;

  const [row] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      passwordHash: usersTable.passwordHash,
      role: usersTable.role,
      companyId: usersTable.companyId,
      companyName: companiesTable.name,
    })
    .from(usersTable)
    .leftJoin(companiesTable, eq(usersTable.companyId, companiesTable.id))
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (!row) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({
    sub: row.id,
    email: row.email,
    role: row.role,
    companyId: row.companyId,
  });

  res.json(
    LoginResponse.parse({
      token,
      principal: {
        id: row.id,
        email: row.email,
        role: row.role,
        companyId: row.companyId,
        companyName: row.companyName,
      },
    }),
  );
});

router.get("/auth/me", requireAuth, async (req: Request, res: Response) => {
  res.json(
    GetMeResponse.parse({
      principal: req.principal,
    }),
  );
});

export default router;
