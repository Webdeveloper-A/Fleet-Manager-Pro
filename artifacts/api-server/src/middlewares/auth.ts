import type { Request, Response, NextFunction } from "express";
import { verifyToken, type Principal } from "../lib/auth";
import { db } from "@workspace/db";
import { usersTable, companiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }
  const token = header.slice(7).trim();
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
      companyId: usersTable.companyId,
      companyName: companiesTable.name,
    })
    .from(usersTable)
    .leftJoin(companiesTable, eq(usersTable.companyId, companiesTable.id))
    .where(eq(usersTable.id, payload.sub))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "User no longer exists" });
    return;
  }

  req.principal = {
    id: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    companyName: user.companyName,
  };
  next();
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.principal || req.principal.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  next();
}

export function requireCompany(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.principal || req.principal.role !== "company" || !req.principal.companyId) {
    res.status(403).json({ error: "Company account required" });
    return;
  }
  next();
}
