import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { JWT_SECRET, JWT_EXPIRES_IN } from "./env";

export type Principal = {
  id: string;
  email: string;
  role: "admin" | "company";
  companyId: string | null;
  companyName: string | null;
};

export type JwtPayload = {
  sub: string;
  email: string;
  role: "admin" | "company";
  companyId: string | null;
};

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
