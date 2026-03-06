import { and, count, desc, eq, gte, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertActivityLog,
  InsertAuditSchedule,
  InsertDevice,
  InsertIncident,
  InsertOpsecItem,
  InsertSecureNote,
  InsertSecurityProtocol,
  InsertSmartHomeDevice,
  InsertThreatIndicator,
  InsertTransferSession,
  InsertUser,
  activityLog,
  auditSchedule,
  devices,
  incidents,
  opsecItems,
  secureNotes,
  securityProtocols,
  smartHomeDevices,
  threatIndicators,
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

// ─── Incidents ────────────────────────────────────────────────────────────────
export async function getIncidents(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(incidents).where(eq(incidents.userId, userId)).orderBy(desc(incidents.createdAt));
}

export async function getIncident(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(incidents).where(and(eq(incidents.id, id), eq(incidents.userId, userId))).limit(1);
  return result[0];
}

export async function createIncident(data: InsertIncident) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(incidents).values(data);
}

export async function updateIncident(id: number, userId: number, data: Partial<InsertIncident>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(incidents).set(data).where(and(eq(incidents.id, id), eq(incidents.userId, userId)));
}

export async function deleteIncident(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(incidents).where(and(eq(incidents.id, id), eq(incidents.userId, userId)));
}

// ─── Activity Log ─────────────────────────────────────────────────────────────
export async function getActivityLog(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activityLog)
    .where(eq(activityLog.userId, userId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

export async function logActivity(data: InsertActivityLog) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(activityLog).values(data);
  } catch {
    // Non-critical - don't throw
  }
}

// ─── Threat Indicators ────────────────────────────────────────────────────────
export async function getThreatIndicators(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(threatIndicators).where(eq(threatIndicators.userId, userId)).orderBy(desc(threatIndicators.createdAt));
}

export async function createThreatIndicator(data: InsertThreatIndicator) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(threatIndicators).values(data);
}

export async function updateThreatIndicator(id: number, userId: number, data: Partial<InsertThreatIndicator>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(threatIndicators).set(data).where(and(eq(threatIndicators.id, id), eq(threatIndicators.userId, userId)));
}

export async function deleteThreatIndicator(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(threatIndicators).where(and(eq(threatIndicators.id, id), eq(threatIndicators.userId, userId)));
}

// ─── Security Stats (Dashboard) ───────────────────────────────────────────────
export async function getSecurityStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const [
    devicesAll,
    opsecAll,
    auditsAll,
    incidentsAll,
    threatsAll,
    recentActivity,
  ] = await Promise.all([
    db.select().from(devices).where(eq(devices.userId, userId)),
    db.select().from(opsecItems).where(eq(opsecItems.userId, userId)),
    db.select().from(auditSchedule).where(eq(auditSchedule.userId, userId)),
    db.select().from(incidents).where(eq(incidents.userId, userId)),
    db.select().from(threatIndicators).where(eq(threatIndicators.userId, userId)),
    db.select().from(activityLog).where(eq(activityLog.userId, userId)).orderBy(desc(activityLog.createdAt)).limit(10),
  ]);

  const opsecCompleted = opsecAll.filter(i => i.isCompleted).length;
  const opsecTotal = opsecAll.length;
  const opsecScore = opsecTotal > 0 ? Math.round((opsecCompleted / opsecTotal) * 100) : 0;

  const airGappedDevices = devicesAll.filter(d => d.isolationStatus === "air_gapped").length;
  const faradayDevices = devicesAll.filter(d => d.isolationStatus === "faraday").length;
  const onlineDevices = devicesAll.filter(d => d.isolationStatus === "online").length;

  const openIncidents = incidentsAll.filter(i => i.status === "open" || i.status === "investigating").length;
  const criticalIncidents = incidentsAll.filter(i => i.severity === "critical" && i.status !== "closed").length;

  const activeThreats = threatsAll.filter(t => t.status === "active").length;
  const criticalThreats = threatsAll.filter(t => t.severity === "critical" && t.status === "active").length;

  const pendingAudits = auditsAll.filter(a => a.status === "pending").length;
  const overdueAudits = auditsAll.filter(a => {
    return a.status === "pending" && new Date(a.scheduledAt) < new Date();
  }).length;

  // Security score calculation (0-100)
  let score = 100;
  if (onlineDevices > 0) score -= Math.min(onlineDevices * 10, 30);
  if (criticalIncidents > 0) score -= Math.min(criticalIncidents * 15, 30);
  if (criticalThreats > 0) score -= Math.min(criticalThreats * 10, 20);
  if (overdueAudits > 0) score -= Math.min(overdueAudits * 5, 15);
  score = Math.max(0, Math.min(100, score));

  // Threat level
  let threatLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
  if (criticalIncidents > 0 || criticalThreats > 0) threatLevel = "CRITICAL";
  else if (openIncidents > 0 || activeThreats > 2) threatLevel = "HIGH";
  else if (openIncidents > 0 || activeThreats > 0 || onlineDevices > 0) threatLevel = "MEDIUM";

  return {
    securityScore: score,
    threatLevel,
    devices: {
      total: devicesAll.length,
      airGapped: airGappedDevices,
      faraday: faradayDevices,
      online: onlineDevices,
    },
    opsec: {
      total: opsecTotal,
      completed: opsecCompleted,
      score: opsecScore,
      critical: opsecAll.filter(i => i.priority === "critical" && !i.isCompleted).length,
    },
    incidents: {
      total: incidentsAll.length,
      open: openIncidents,
      critical: criticalIncidents,
    },
    threats: {
      total: threatsAll.length,
      active: activeThreats,
      critical: criticalThreats,
    },
    audits: {
      total: auditsAll.length,
      pending: pendingAudits,
      overdue: overdueAudits,
    },
    recentActivity,
  };
}

// ─── Security Score History ────────────────────────────────────────────────────
export async function saveScoreSnapshot(userId: number, data: {
  score: number;
  deviceCount: number;
  opsecCompleted: number;
  opsecTotal: number;
  openIncidents: number;
  activeThreats: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) return;
  try {
    // Use raw SQL since we don't have a Drizzle schema object for this table yet
    await db.execute(
      `INSERT INTO security_score_history (userId, score, deviceCount, opsecCompleted, opsecTotal, openIncidents, activeThreats, notes)
       VALUES (${userId}, ${data.score}, ${data.deviceCount}, ${data.opsecCompleted}, ${data.opsecTotal}, ${data.openIncidents}, ${data.activeThreats}, ${data.notes ? `'${data.notes.replace(/'/g, "''")}'` : 'NULL'})`
    );
  } catch {
    // Non-critical
  }
}

export async function getScoreHistory(userId: number, days = 30): Promise<Array<{
  score: number;
  deviceCount: number;
  opsecCompleted: number;
  opsecTotal: number;
  openIncidents: number;
  activeThreats: number;
  recordedAt: Date;
}>> {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db.execute(
      `SELECT score, deviceCount, opsecCompleted, opsecTotal, openIncidents, activeThreats, recordedAt
       FROM security_score_history
       WHERE userId = ${userId} AND recordedAt >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
       ORDER BY recordedAt ASC`
    );
    return (rows[0] as unknown as Array<Record<string, unknown>>).map(r => ({
      score: Number(r.score),
      deviceCount: Number(r.deviceCount),
      opsecCompleted: Number(r.opsecCompleted),
      opsecTotal: Number(r.opsecTotal),
      openIncidents: Number(r.openIncidents),
      activeThreats: Number(r.activeThreats),
      recordedAt: new Date(r.recordedAt as string),
    }));
  } catch {
    return [];
  }
}

export async function getScoreHistoryStats(userId: number): Promise<{
  current: number;
  previous: number;
  trend: "up" | "down" | "stable";
  min7d: number;
  max7d: number;
  avg30d: number;
}> {
  const db = await getDb();
  if (!db) return { current: 0, previous: 0, trend: "stable", min7d: 0, max7d: 0, avg30d: 0 };
  try {
    const rows = await db.execute(
      `SELECT 
        (SELECT score FROM security_score_history WHERE userId=${userId} ORDER BY recordedAt DESC LIMIT 1) as current_score,
        (SELECT score FROM security_score_history WHERE userId=${userId} ORDER BY recordedAt DESC LIMIT 1 OFFSET 1) as previous_score,
        (SELECT MIN(score) FROM security_score_history WHERE userId=${userId} AND recordedAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as min7d,
        (SELECT MAX(score) FROM security_score_history WHERE userId=${userId} AND recordedAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as max7d,
        (SELECT AVG(score) FROM security_score_history WHERE userId=${userId} AND recordedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as avg30d`
    );
    const r = (rows[0] as unknown as Array<Record<string, unknown>>)[0] || {};
    const current = Number(r.current_score ?? 0);
    const previous = Number(r.previous_score ?? current);
    return {
      current,
      previous,
      trend: current > previous ? "up" : current < previous ? "down" : "stable",
      min7d: Number(r.min7d ?? current),
      max7d: Number(r.max7d ?? current),
      avg30d: Math.round(Number(r.avg30d ?? current)),
    };
  } catch {
    return { current: 0, previous: 0, trend: "stable", min7d: 0, max7d: 0, avg30d: 0 };
  }
}

// ─── Security Reports ─────────────────────────────────────────────────────────
export async function getSecurityReports(userId: number): Promise<Array<{
  id: number;
  title: string;
  reportType: string;
  summary: string | null;
  score: number | null;
  status: string;
  createdAt: Date;
}>> {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db.execute(
      `SELECT id, title, reportType, summary, score, status, createdAt FROM security_reports WHERE userId=${userId} ORDER BY createdAt DESC`
    );
    return (rows[0] as unknown as Array<Record<string, unknown>>).map(r => ({
      id: Number(r.id),
      title: String(r.title),
      reportType: String(r.reportType),
      summary: r.summary ? String(r.summary) : null,
      score: r.score !== null ? Number(r.score) : null,
      status: String(r.status),
      createdAt: new Date(r.createdAt as string),
    }));
  } catch {
    return [];
  }
}

export async function createSecurityReport(userId: number, data: {
  title: string;
  reportType: string;
  content: string;
  summary: string;
  score: number;
  status?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const safe = (s: string) => s.replace(/'/g, "''");
  const result = await db.execute(
    `INSERT INTO security_reports (userId, title, reportType, content, summary, score, status)
     VALUES (${userId}, '${safe(data.title)}', '${safe(data.reportType)}', '${safe(data.content)}', '${safe(data.summary)}', ${data.score}, '${data.status ?? "final"}')`  
  );
  return (result[0] as unknown as { insertId: number }).insertId;
}

export async function getSecurityReportContent(id: number, userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db.execute(
      `SELECT content FROM security_reports WHERE id=${id} AND userId=${userId} LIMIT 1`
    );
    const r = (rows[0] as unknown as Array<Record<string, unknown>>)[0];
    return r ? String(r.content) : null;
  } catch {
    return null;
  }
}

export async function deleteSecurityReport(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.execute(`DELETE FROM security_reports WHERE id=${id} AND userId=${userId}`);
}
