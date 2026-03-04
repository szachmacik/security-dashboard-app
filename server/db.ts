import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertAuditSchedule,
  InsertDevice,
  InsertOpsecItem,
  InsertSecureNote,
  InsertSecurityProtocol,
  InsertSmartHomeDevice,
  InsertTransferSession,
  InsertUser,
  auditSchedule,
  devices,
  opsecItems,
  secureNotes,
  securityProtocols,
  smartHomeDevices,
  transferSessions,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Devices ──────────────────────────────────────────────────────────────────
export async function getDevices(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(devices).where(eq(devices.userId, userId)).orderBy(desc(devices.createdAt));
}

export async function getDevice(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(devices).where(and(eq(devices.id, id), eq(devices.userId, userId))).limit(1);
  return result[0];
}

export async function createDevice(data: InsertDevice) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(devices).values(data);
}

export async function updateDevice(id: number, userId: number, data: Partial<InsertDevice>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(devices).set(data).where(and(eq(devices.id, id), eq(devices.userId, userId)));
}

export async function deleteDevice(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(devices).where(and(eq(devices.id, id), eq(devices.userId, userId)));
}

// ─── OPSEC Items ──────────────────────────────────────────────────────────────
export async function getOpsecItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(opsecItems).where(eq(opsecItems.userId, userId)).orderBy(opsecItems.category, opsecItems.priority);
}

export async function createOpsecItem(data: InsertOpsecItem) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(opsecItems).values(data);
}

export async function updateOpsecItem(id: number, userId: number, data: Partial<InsertOpsecItem>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(opsecItems).set(data).where(and(eq(opsecItems.id, id), eq(opsecItems.userId, userId)));
}

export async function deleteOpsecItem(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(opsecItems).where(and(eq(opsecItems.id, id), eq(opsecItems.userId, userId)));
}

// ─── Audit Schedule ───────────────────────────────────────────────────────────
export async function getAudits(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditSchedule).where(eq(auditSchedule.userId, userId)).orderBy(desc(auditSchedule.scheduledAt));
}

export async function createAudit(data: InsertAuditSchedule) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(auditSchedule).values(data);
}

export async function updateAudit(id: number, userId: number, data: Partial<InsertAuditSchedule>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(auditSchedule).set(data).where(and(eq(auditSchedule.id, id), eq(auditSchedule.userId, userId)));
}

export async function deleteAudit(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(auditSchedule).where(and(eq(auditSchedule.id, id), eq(auditSchedule.userId, userId)));
}

// ─── Transfer Sessions ────────────────────────────────────────────────────────
export async function getTransferSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transferSessions).where(eq(transferSessions.userId, userId)).orderBy(desc(transferSessions.createdAt));
}

export async function createTransferSession(data: InsertTransferSession) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(transferSessions).values(data);
}

export async function updateTransferSession(id: number, userId: number, data: Partial<InsertTransferSession>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(transferSessions).set(data).where(and(eq(transferSessions.id, id), eq(transferSessions.userId, userId)));
}

// ─── Smart Home Devices ───────────────────────────────────────────────────────
export async function getSmartHomeDevices(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(smartHomeDevices).where(eq(smartHomeDevices.userId, userId)).orderBy(smartHomeDevices.location);
}

export async function createSmartHomeDevice(data: InsertSmartHomeDevice) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(smartHomeDevices).values(data);
}

export async function updateSmartHomeDevice(id: number, userId: number, data: Partial<InsertSmartHomeDevice>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(smartHomeDevices).set(data).where(and(eq(smartHomeDevices.id, id), eq(smartHomeDevices.userId, userId)));
}

export async function deleteSmartHomeDevice(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(smartHomeDevices).where(and(eq(smartHomeDevices.id, id), eq(smartHomeDevices.userId, userId)));
}

// ─── Security Protocols ───────────────────────────────────────────────────────
export async function getSecurityProtocols(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(securityProtocols).where(eq(securityProtocols.userId, userId)).orderBy(securityProtocols.category);
}

export async function createSecurityProtocol(data: InsertSecurityProtocol) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(securityProtocols).values(data);
}

export async function updateSecurityProtocol(id: number, userId: number, data: Partial<InsertSecurityProtocol>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(securityProtocols).set(data).where(and(eq(securityProtocols.id, id), eq(securityProtocols.userId, userId)));
}

export async function deleteSecurityProtocol(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(securityProtocols).where(and(eq(securityProtocols.id, id), eq(securityProtocols.userId, userId)));
}

// ─── Secure Notes ─────────────────────────────────────────────────────────────
export async function getSecureNotes(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(secureNotes).where(eq(secureNotes.userId, userId)).orderBy(desc(secureNotes.updatedAt));
}

export async function createSecureNote(data: InsertSecureNote) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(secureNotes).values(data);
}

export async function updateSecureNote(id: number, userId: number, data: Partial<InsertSecureNote>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(secureNotes).set(data).where(and(eq(secureNotes.id, id), eq(secureNotes.userId, userId)));
}

export async function deleteSecureNote(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(secureNotes).where(and(eq(secureNotes.id, id), eq(secureNotes.userId, userId)));
}
