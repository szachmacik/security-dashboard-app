import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Offline Devices ──────────────────────────────────────────────────────────
export const devices = mysqlTable("devices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  type: mysqlEnum("type", ["laptop", "desktop", "phone", "tablet", "server", "raspberry_pi", "usb_drive", "other"]).notNull().default("laptop"),
  isolationStatus: mysqlEnum("isolationStatus", ["air_gapped", "faraday", "offline", "online"]).notNull().default("offline"),
  location: varchar("location", { length: 256 }),
  os: varchar("os", { length: 64 }),
  purpose: text("purpose"),
  lastSync: timestamp("lastSync"),
  notes: text("notes"),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high", "critical"]).notNull().default("low"),
  isVerified: boolean("isVerified").notNull().default(false),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;

// ─── OPSEC Checklist ──────────────────────────────────────────────────────────
export const opsecItems = mysqlTable("opsec_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["physical", "network", "cryptographic", "opsec", "smart_home"]).notNull().default("opsec"),
  priority: mysqlEnum("priority", ["critical", "high", "medium", "low"]).notNull().default("medium"),
  isCompleted: boolean("isCompleted").notNull().default(false),
  completedAt: timestamp("completedAt"),
  isDefault: boolean("isDefault").notNull().default(false),
  notes: text("notes"),
  dueDate: timestamp("dueDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type OpsecItem = typeof opsecItems.$inferSelect;
export type InsertOpsecItem = typeof opsecItems.$inferInsert;

// ─── Audit Schedule & History ─────────────────────────────────────────────────
export const auditSchedule = mysqlTable("audit_schedule", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  scheduledAt: timestamp("scheduledAt").notNull(),
  recurrence: mysqlEnum("recurrence", ["once", "daily", "weekly", "monthly"]).notNull().default("once"),
  status: mysqlEnum("status", ["pending", "completed", "overdue", "cancelled"]).notNull().default("pending"),
  completedAt: timestamp("completedAt"),
  findings: text("findings"),
  severity: mysqlEnum("severity", ["critical", "high", "medium", "low", "info"]).default("info"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AuditSchedule = typeof auditSchedule.$inferSelect;
export type InsertAuditSchedule = typeof auditSchedule.$inferInsert;

// ─── QR Transfer Sessions ─────────────────────────────────────────────────────
export const transferSessions = mysqlTable("transfer_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  direction: mysqlEnum("direction", ["outbound", "inbound"]).notNull(),
  dataType: varchar("dataType", { length: 64 }).notNull().default("text"),
  dataSize: int("dataSize"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "failed"]).notNull().default("pending"),
  sourceDevice: varchar("sourceDevice", { length: 128 }),
  targetDevice: varchar("targetDevice", { length: 128 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TransferSession = typeof transferSessions.$inferSelect;
export type InsertTransferSession = typeof transferSessions.$inferInsert;

// ─── Smart Home Devices ───────────────────────────────────────────────────────
export const smartHomeDevices = mysqlTable("smart_home_devices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  protocol: mysqlEnum("protocol", ["zigbee", "zwave", "wifi", "mqtt", "other"]).notNull().default("zigbee"),
  type: mysqlEnum("type", ["socket", "relay", "sensor", "switch", "camera", "lock", "other"]).notNull().default("socket"),
  location: varchar("location", { length: 256 }),
  isOnline: boolean("isOnline").notNull().default(false),
  isPowered: boolean("isPowered").notNull().default(false),
  automationEnabled: boolean("automationEnabled").notNull().default(false),
  automationRule: text("automationRule"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SmartHomeDevice = typeof smartHomeDevices.$inferSelect;
export type InsertSmartHomeDevice = typeof smartHomeDevices.$inferInsert;

// ─── Security Protocols Library ───────────────────────────────────────────────
export const securityProtocols = mysqlTable("security_protocols", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  category: mysqlEnum("category", ["air_gap", "optical", "acoustic", "physical", "network", "cryptographic"]).notNull(),
  difficulty: mysqlEnum("difficulty", ["beginner", "intermediate", "advanced", "expert"]).notNull().default("intermediate"),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high", "critical"]).notNull().default("medium"),
  description: text("description"),
  instructions: text("instructions"),
  requirements: text("requirements"),
  isBuiltIn: boolean("isBuiltIn").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SecurityProtocol = typeof securityProtocols.$inferSelect;
export type InsertSecurityProtocol = typeof securityProtocols.$inferInsert;

// ─── Secure Notes ─────────────────────────────────────────────────────────────
export const secureNotes = mysqlTable("secure_notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content"),
  tags: varchar("tags", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SecureNote = typeof secureNotes.$inferSelect;
export type InsertSecureNote = typeof secureNotes.$inferInsert;

// ─── Incidents (NEW) ──────────────────────────────────────────────────────────
export const incidents = mysqlTable("incidents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  severity: mysqlEnum("severity", ["critical", "high", "medium", "low", "info"]).notNull().default("medium"),
  status: mysqlEnum("status", ["open", "investigating", "contained", "resolved", "closed"]).notNull().default("open"),
  category: mysqlEnum("category", ["physical_breach", "network_intrusion", "device_compromise", "data_leak", "social_engineering", "malware", "unauthorized_access", "other"]).notNull().default("other"),
  affectedDevices: text("affectedDevices"),   // JSON array of device names
  timeline: text("timeline"),                  // JSON array of timeline events
  mitigationSteps: text("mitigationSteps"),
  resolvedAt: timestamp("resolvedAt"),
  reportedBy: varchar("reportedBy", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = typeof incidents.$inferInsert;

// ─── Activity Log (NEW) ───────────────────────────────────────────────────────
export const activityLog = mysqlTable("activity_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 128 }).notNull(),
  module: varchar("module", { length: 64 }).notNull(),
  details: text("details"),
  severity: mysqlEnum("severity", ["info", "warning", "error", "critical"]).notNull().default("info"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = typeof activityLog.$inferInsert;

// ─── Threat Indicators (NEW) ──────────────────────────────────────────────────
export const threatIndicators = mysqlTable("threat_indicators", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["ioc", "ttp", "vulnerability", "risk_factor", "anomaly"]).notNull().default("risk_factor"),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  severity: mysqlEnum("severity", ["critical", "high", "medium", "low"]).notNull().default("medium"),
  status: mysqlEnum("status", ["active", "mitigated", "false_positive", "monitoring"]).notNull().default("active"),
  source: varchar("source", { length: 128 }),
  mitigationNote: text("mitigationNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ThreatIndicator = typeof threatIndicators.$inferSelect;
export type InsertThreatIndicator = typeof threatIndicators.$inferInsert;
