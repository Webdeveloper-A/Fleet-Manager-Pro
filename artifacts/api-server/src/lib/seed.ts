import { db } from "@workspace/db";
import {
  usersTable,
  companiesTable,
  vehiclesTable,
  documentsTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";
import { logger } from "./logger";

const ADMIN_EMAIL = "admin@fleetdocs.app";
const ADMIN_PASSWORD = "admin1234";
const DEMO_EMAIL = "demo@fleetdocs.app";
const DEMO_PASSWORD = "demo1234";

export async function seedAdminIfMissing(): Promise<void> {
  const [existingAdmin] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, ADMIN_EMAIL))
    .limit(1);

  if (!existingAdmin) {
    const adminHash = await hashPassword(ADMIN_PASSWORD);
    await db.insert(usersTable).values({
      email: ADMIN_EMAIL,
      passwordHash: adminHash,
      role: "admin",
      companyId: null,
    });
    logger.info({ email: ADMIN_EMAIL }, "[seed] created default admin");
  }

  const [existingDemo] = await db
    .select({ id: usersTable.id, companyId: usersTable.companyId })
    .from(usersTable)
    .where(eq(usersTable.email, DEMO_EMAIL))
    .limit(1);

  if (existingDemo) return;

  const [demoCompany] = await db
    .insert(companiesTable)
    .values({
      name: "Northwind Logistics",
      contactName: "Aigerim Akhmetova",
      phone: "+998 90 123 45 67",
    })
    .returning();

  const demoHash = await hashPassword(DEMO_PASSWORD);
  await db.insert(usersTable).values({
    email: DEMO_EMAIL,
    passwordHash: demoHash,
    role: "company",
    companyId: demoCompany.id,
  });

  const now = Date.now();
  const day = 86_400_000;

  const [v1] = await db
    .insert(vehiclesTable)
    .values({
      companyId: demoCompany.id,
      name: "MAN TGS Tractor",
      plateNumber: "01 A 123 BC",
      vinCode: "WMAN1234567890XYZ",
      year: 2021,
      techPassportSeries: "AAB 7820",
      driverName: "Bekzod Karimov",
    })
    .returning();

  const [v2] = await db
    .insert(vehiclesTable)
    .values({
      companyId: demoCompany.id,
      name: "Volvo FH16 Trailer",
      plateNumber: "30 D 998 KZ",
      vinCode: "YV2A4CFC8KB123456",
      year: 2019,
      techPassportSeries: "BCA 1144",
      driverName: "Anvar Nazarov",
    })
    .returning();

  const [v3] = await db
    .insert(vehiclesTable)
    .values({
      companyId: demoCompany.id,
      name: "Kamaz 5490 Hauler",
      plateNumber: "10 H 412 RK",
      vinCode: "X7H549012MR000123",
      year: 2023,
      techPassportSeries: "CCD 9911",
      driverName: "Sherzod Yusupov",
    })
    .returning();

  await db.insert(documentsTable).values([
    {
      vehicleId: v1.id,
      companyId: demoCompany.id,
      name: "OSAGO Insurance",
      number: "OSG-2024-77110",
      startDate: new Date(now - 200 * day),
      endDate: new Date(now + 165 * day),
      note: "Auto-renews via broker",
    },
    {
      vehicleId: v1.id,
      companyId: demoCompany.id,
      name: "Tech Inspection",
      number: "TECH-441-AB",
      startDate: new Date(now - 350 * day),
      endDate: new Date(now + 7 * day),
      note: "Schedule renewal next week",
    },
    {
      vehicleId: v2.id,
      companyId: demoCompany.id,
      name: "Cargo License",
      number: "CL-2023-14490",
      startDate: new Date(now - 400 * day),
      endDate: new Date(now - 12 * day),
      note: "OVERDUE — file extension",
    },
    {
      vehicleId: v2.id,
      companyId: demoCompany.id,
      name: "Driver Medical",
      number: "MED-AN-7741",
      startDate: new Date(now - 90 * day),
      endDate: new Date(now + 12 * day),
    },
    {
      vehicleId: v3.id,
      companyId: demoCompany.id,
      name: "OSAGO Insurance",
      number: "OSG-2024-99012",
      startDate: new Date(now - 30 * day),
      endDate: new Date(now + 335 * day),
    },
    {
      vehicleId: v3.id,
      companyId: demoCompany.id,
      name: "International Permit",
      number: "INT-9001-RK",
      startDate: new Date(now - 100 * day),
      endDate: new Date(now + 3 * day),
      note: "Renew before crossing border",
    },
  ]);

  logger.info({ company: demoCompany.name }, "[seed] created demo company + fleet");
}
