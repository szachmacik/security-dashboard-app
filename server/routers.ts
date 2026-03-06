import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { seedDefaultData } from "./seed";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Dashboard Stats ─────────────────────────────────────────────────────────
  stats: router({
    security: protectedProcedure.query(({ ctx }) => db.getSecurityStats(ctx.user.id)),
    activityLog: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
      .query(({ ctx, input }) => db.getActivityLog(ctx.user.id, input.limit)),
  }),

  // ─── Devices ────────────────────────────────────────────────────────────────
  devices: router({
    list: protectedProcedure.query(({ ctx }) => db.getDevices(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) =>
      db.getDevice(input.id, ctx.user.id)
    ),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["laptop", "desktop", "phone", "tablet", "server", "raspberry_pi", "usb_drive", "other"]),
        location: z.string().optional(),
        isolationStatus: z.enum(["air_gapped", "faraday", "offline", "online"]),
        os: z.string().optional(),
        purpose: z.string().optional(),
        riskLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createDevice({ ...input, userId: ctx.user.id });
        await db.logActivity({ userId: ctx.user.id, action: "device_added", module: "devices", details: `Dodano urządzenie: ${input.name}`, severity: "info" });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        type: z.enum(["laptop", "desktop", "phone", "tablet", "server", "raspberry_pi", "usb_drive", "other"]).optional(),
        location: z.string().optional(),
        isolationStatus: z.enum(["air_gapped", "faraday", "offline", "online"]).optional(),
        isVerified: z.boolean().optional(),
        lastSync: z.date().optional(),
        notes: z.string().optional(),
        riskLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
        os: z.string().optional(),
        purpose: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateDevice(id, ctx.user.id, data);
        if (data.isolationStatus) {
          await db.logActivity({ userId: ctx.user.id, action: "device_isolation_changed", module: "devices", details: `Status izolacji zmieniony na: ${data.isolationStatus}`, severity: data.isolationStatus === "online" ? "warning" : "info" });
        }
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteDevice(input.id, ctx.user.id);
        await db.logActivity({ userId: ctx.user.id, action: "device_deleted", module: "devices", details: `Usunięto urządzenie ID: ${input.id}`, severity: "warning" });
      }),
    syncNow: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateDevice(input.id, ctx.user.id, { lastSync: new Date() });
        await db.logActivity({ userId: ctx.user.id, action: "device_synced", module: "devices", details: `Sync urządzenia ID: ${input.id}`, severity: "info" });
      }),
    verify: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateDevice(input.id, ctx.user.id, { isVerified: true, verifiedAt: new Date() });
        await db.logActivity({ userId: ctx.user.id, action: "device_verified", module: "devices", details: `Zweryfikowano urządzenie ID: ${input.id}`, severity: "info" });
      }),
  }),

  // ─── OPSEC Checklist ────────────────────────────────────────────────────────
  opsec: router({
    list: protectedProcedure.query(({ ctx }) => db.getOpsecItems(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({
        category: z.enum(["physical", "network", "cryptographic", "opsec", "smart_home"]),
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(["critical", "high", "medium", "low"]),
        notes: z.string().optional(),
        dueDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createOpsecItem({ ...input, userId: ctx.user.id });
        await db.logActivity({ userId: ctx.user.id, action: "opsec_item_created", module: "opsec", details: `Dodano punkt OPSEC: ${input.title}`, severity: "info" });
      }),
    toggle: protectedProcedure
      .input(z.object({ id: z.number(), isCompleted: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateOpsecItem(input.id, ctx.user.id, {
          isCompleted: input.isCompleted,
          completedAt: input.isCompleted ? new Date() : null,
        });
        await db.logActivity({ userId: ctx.user.id, action: input.isCompleted ? "opsec_completed" : "opsec_uncompleted", module: "opsec", details: `OPSEC item ID: ${input.id}`, severity: "info" });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        priority: z.enum(["critical", "high", "medium", "low"]).optional(),
        notes: z.string().optional(),
        dueDate: z.date().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateOpsecItem(id, ctx.user.id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteOpsecItem(input.id, ctx.user.id);
        await db.logActivity({ userId: ctx.user.id, action: "opsec_deleted", module: "opsec", details: `Usunięto OPSEC item ID: ${input.id}`, severity: "warning" });
      }),
    seed: protectedProcedure.mutation(async ({ ctx }) => {
      const result = await seedDefaultData(ctx.user.id);
      await db.logActivity({ userId: ctx.user.id, action: "opsec_seeded", module: "opsec", details: "Załadowano domyślną listę OPSEC", severity: "info" });
      return result;
    }),
  }),

  // ─── Audit Schedule ──────────────────────────────────────────────────────────
  audits: router({
    list: protectedProcedure.query(({ ctx }) => db.getAudits(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        scheduledAt: z.date(),
        recurrence: z.enum(["once", "daily", "weekly", "monthly"]),
        severity: z.enum(["critical", "high", "medium", "low", "info"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createAudit({ ...input, userId: ctx.user.id });
        await db.logActivity({ userId: ctx.user.id, action: "audit_scheduled", module: "audits", details: `Zaplanowano audyt: ${input.title}`, severity: "info" });
      }),
    complete: protectedProcedure
      .input(z.object({ id: z.number(), findings: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateAudit(input.id, ctx.user.id, {
          status: "completed",
          completedAt: new Date(),
          findings: input.findings,
        });
        await db.logActivity({ userId: ctx.user.id, action: "audit_completed", module: "audits", details: `Zakończono audyt ID: ${input.id}`, severity: "info" });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        scheduledAt: z.date().optional(),
        status: z.enum(["pending", "completed", "overdue", "cancelled"]).optional(),
        findings: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateAudit(id, ctx.user.id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteAudit(input.id, ctx.user.id)),
  }),

  // ─── QR Transfer ─────────────────────────────────────────────────────────────
  transfer: router({
    list: protectedProcedure.query(({ ctx }) => db.getTransferSessions(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({
        direction: z.enum(["outbound", "inbound"]),
        dataType: z.string().default("text"),
        dataSize: z.number().optional(),
        sourceDevice: z.string().optional(),
        targetDevice: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createTransferSession({ ...input, userId: ctx.user.id });
        await db.logActivity({ userId: ctx.user.id, action: "qr_transfer_created", module: "transfer", details: `Transfer QR ${input.direction}: ${input.dataType}`, severity: "info" });
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "in_progress", "completed", "failed"]),
      }))
      .mutation(({ ctx, input }) =>
        db.updateTransferSession(input.id, ctx.user.id, { status: input.status })
      ),
  }),

  // ─── Smart Home ───────────────────────────────────────────────────────────────
  smartHome: router({
    list: protectedProcedure.query(({ ctx }) => db.getSmartHomeDevices(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        protocol: z.enum(["zigbee", "zwave", "wifi", "mqtt", "other"]),
        type: z.enum(["socket", "relay", "sensor", "switch", "camera", "lock", "other"]),
        location: z.string().optional(),
        automationRule: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createSmartHomeDevice({ ...input, userId: ctx.user.id });
        await db.logActivity({ userId: ctx.user.id, action: "smart_home_device_added", module: "smart_home", details: `Dodano urządzenie Smart Home: ${input.name}`, severity: "info" });
      }),
    toggle: protectedProcedure
      .input(z.object({ id: z.number(), isPowered: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateSmartHomeDevice(input.id, ctx.user.id, { isPowered: input.isPowered });
        await db.logActivity({ userId: ctx.user.id, action: input.isPowered ? "smart_home_on" : "smart_home_off", module: "smart_home", details: `Urządzenie ID: ${input.id} ${input.isPowered ? "włączone" : "wyłączone"}`, severity: "info" });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        isOnline: z.boolean().optional(),
        isPowered: z.boolean().optional(),
        automationEnabled: z.boolean().optional(),
        automationRule: z.string().optional(),
        location: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateSmartHomeDevice(id, ctx.user.id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteSmartHomeDevice(input.id, ctx.user.id)),
  }),

  // ─── Security Protocols ───────────────────────────────────────────────────────
  protocols: router({
    list: protectedProcedure.query(({ ctx }) => db.getSecurityProtocols(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        category: z.enum(["air_gap", "optical", "acoustic", "physical", "network", "cryptographic"]),
        difficulty: z.enum(["beginner", "intermediate", "advanced", "expert"]),
        riskLevel: z.enum(["low", "medium", "high", "critical"]),
        description: z.string().optional(),
        instructions: z.string().optional(),
        requirements: z.string().optional(),
      }))
      .mutation(({ ctx, input }) =>
        db.createSecurityProtocol({ ...input, userId: ctx.user.id })
      ),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        instructions: z.string().optional(),
        requirements: z.string().optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
        riskLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateSecurityProtocol(id, ctx.user.id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteSecurityProtocol(input.id, ctx.user.id)),
    seedBuiltIn: protectedProcedure.mutation(({ ctx }) => seedBuiltInProtocols(ctx.user.id)),
  }),

  // ─── Secure Notes ─────────────────────────────────────────────────────────────
  notes: router({
    list: protectedProcedure.query(({ ctx }) => db.getSecureNotes(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        content: z.string().optional(),
        tags: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createSecureNote({ ...input, userId: ctx.user.id });
        await db.logActivity({ userId: ctx.user.id, action: "note_created", module: "notes", details: `Dodano notatkę: ${input.title}`, severity: "info" });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        tags: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateSecureNote(id, ctx.user.id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteSecureNote(input.id, ctx.user.id)),
  }),

  // ─── Incidents ────────────────────────────────────────────────────────────────
  incidents: router({
    list: protectedProcedure.query(({ ctx }) => db.getIncidents(ctx.user.id)),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => db.getIncident(input.id, ctx.user.id)),
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        severity: z.enum(["critical", "high", "medium", "low", "info"]),
        category: z.enum(["physical_breach", "network_intrusion", "device_compromise", "data_leak", "social_engineering", "malware", "unauthorized_access", "other"]),
        affectedDevices: z.string().optional(),
        mitigationSteps: z.string().optional(),
        reportedBy: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createIncident({ ...input, userId: ctx.user.id });
        await db.logActivity({ userId: ctx.user.id, action: "incident_created", module: "incidents", details: `Zgłoszono incydent: ${input.title} [${input.severity}]`, severity: input.severity === "critical" ? "critical" : input.severity === "high" ? "error" : "warning" });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        severity: z.enum(["critical", "high", "medium", "low", "info"]).optional(),
        status: z.enum(["open", "investigating", "contained", "resolved", "closed"]).optional(),
        mitigationSteps: z.string().optional(),
        timeline: z.string().optional(),
        affectedDevices: z.string().optional(),
        resolvedAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateIncident(id, ctx.user.id, data);
        if (data.status) {
          await db.logActivity({ userId: ctx.user.id, action: "incident_status_changed", module: "incidents", details: `Incydent ID: ${id} → ${data.status}`, severity: data.status === "resolved" || data.status === "closed" ? "info" : "warning" });
        }
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteIncident(input.id, ctx.user.id)),
    resolve: protectedProcedure
      .input(z.object({ id: z.number(), mitigationSteps: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateIncident(input.id, ctx.user.id, {
          status: "resolved",
          resolvedAt: new Date(),
          mitigationSteps: input.mitigationSteps,
        });
        await db.logActivity({ userId: ctx.user.id, action: "incident_resolved", module: "incidents", details: `Rozwiązano incydent ID: ${input.id}`, severity: "info" });
      }),
  }),

  // ─── Score History & Trends ──────────────────────────────────────────────────
  scoreHistory: router({
    get: protectedProcedure
      .input(z.object({ days: z.number().min(7).max(90).default(30) }))
      .query(({ ctx, input }) => db.getScoreHistory(ctx.user.id, input.days)),
    stats: protectedProcedure.query(({ ctx }) => db.getScoreHistoryStats(ctx.user.id)),
    snapshot: protectedProcedure.mutation(async ({ ctx }) => {
      const stats = await db.getSecurityStats(ctx.user.id);
      if (!stats) return;
      await db.saveScoreSnapshot(ctx.user.id, {
        score: stats.securityScore,
        deviceCount: stats.devices.total,
        opsecCompleted: stats.opsec.completed,
        opsecTotal: stats.opsec.total,
        openIncidents: stats.incidents.open,
        activeThreats: stats.threats.active,
      });
      // Notify owner if score is critical or incidents are critical
      if (stats.securityScore < 40) {
        await notifyOwner({
          title: `⚠️ Security Score krytyczny: ${stats.securityScore}/100`,
          content: `Poziom zagrożenia: ${stats.threatLevel}\nOtwarte incydenty: ${stats.incidents.open}\nAktywne zagrożenia: ${stats.threats.active}\nUrządzenia online: ${stats.devices.online}`,
        });
      }
      return { saved: true, score: stats.securityScore };
    }),
  }),

  // ─── Security Reports ─────────────────────────────────────────────────────────
  reports: router({
    list: protectedProcedure.query(({ ctx }) => db.getSecurityReports(ctx.user.id)),
    generate: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        reportType: z.enum(["weekly", "monthly", "incident", "audit", "custom"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const stats = await db.getSecurityStats(ctx.user.id);
        if (!stats) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Cannot get stats" });
        const devices = await db.getDevices(ctx.user.id);
        const opsecItems = await db.getOpsecItems(ctx.user.id);
        const incidents = await db.getIncidents(ctx.user.id);
        const threats = await db.getThreatIndicators(ctx.user.id);
        const audits = await db.getAudits(ctx.user.id);
        const now = new Date();
        const content = `# ${input.title}\n\nData generowania: ${now.toLocaleString("pl-PL")}\nTyp raportu: ${input.reportType}\n\n---\n\n## Podsumowanie Bezpieczeństwa\n\n| Metryka | Wartość |\n|---------|---------|\n| Security Score | ${stats.securityScore}/100 |\n| Poziom Zagrożenia | ${stats.threatLevel} |\n| Urządzenia (total) | ${stats.devices.total} |\n| Air-Gapped | ${stats.devices.airGapped} |\n| Online | ${stats.devices.online} |\n| OPSEC Ukończone | ${stats.opsec.completed}/${stats.opsec.total} |\n| Otwarte Incydenty | ${stats.incidents.open} |\n| Aktywne Zagrożenia | ${stats.threats.active} |\n| Zaległe Audyty | ${stats.audits.overdue} |\n\n---\n\n## Urządzenia (${devices.length})\n\n${devices.map(d => `- **${d.name}** [${d.type}] — ${d.isolationStatus} — Ryzyko: ${d.riskLevel}${d.isVerified ? " ✓" : " ⚠️"}`).join("\n")}\n\n---\n\n## OPSEC Checklist\n\n${["physical", "network", "cryptographic", "opsec", "smart_home"].map(cat => {
          const items = opsecItems.filter(i => i.category === cat);
          if (!items.length) return "";
          return `### ${cat.toUpperCase()}\n${items.map(i => `- [${i.isCompleted ? "x" : " "}] **${i.priority.toUpperCase()}** ${i.title}`).join("\n")}`;
        }).filter(Boolean).join("\n\n")}\n\n---\n\n## Incydenty (${incidents.length})\n\n${incidents.length ? incidents.map(i => `- **[${i.severity.toUpperCase()}]** ${i.title} — Status: ${i.status} — ${new Date(i.createdAt).toLocaleDateString("pl-PL")}`).join("\n") : "Brak incydentów."}\n\n---\n\n## Zagrożenia (${threats.length})\n\n${threats.length ? threats.map(t => `- **[${t.severity.toUpperCase()}]** ${t.title} — ${t.type} — Status: ${t.status}`).join("\n") : "Brak zagrożeń."}\n\n---\n\n## Audyty (${audits.length})\n\n${audits.length ? audits.map(a => `- **${a.title}** — ${a.status} — ${new Date(a.scheduledAt).toLocaleDateString("pl-PL")}${a.findings ? " — Wyniki: " + a.findings.substring(0, 100) : ""}`).join("\n") : "Brak audytów."}\n\n---\n\n*Raport wygenerowany automatycznie przez Security Dashboard - Cyber Bunker*`;
        const summary = `Security Score: ${stats.securityScore}/100 | Zagrożenie: ${stats.threatLevel} | Urządzenia: ${stats.devices.total} | Incydenty: ${stats.incidents.open} otwarte | OPSEC: ${stats.opsec.completed}/${stats.opsec.total}`;
        const id = await db.createSecurityReport(ctx.user.id, {
          title: input.title,
          reportType: input.reportType,
          content,
          summary,
          score: stats.securityScore,
        });
        await db.logActivity({ userId: ctx.user.id, action: "report_generated", module: "reports", details: `Wygenerowano raport: ${input.title}`, severity: "info" });
        return { id, content, summary, score: stats.securityScore };
      }),
    getContent: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => db.getSecurityReportContent(input.id, ctx.user.id)),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteSecurityReport(input.id, ctx.user.id)),
  }),

  // ─── Threat Indicators ────────────────────────────────────────────────────────
  threats: router({
    list: protectedProcedure.query(({ ctx }) => db.getThreatIndicators(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({
        type: z.enum(["ioc", "ttp", "vulnerability", "risk_factor", "anomaly"]),
        title: z.string().min(1),
        description: z.string().optional(),
        severity: z.enum(["critical", "high", "medium", "low"]),
        source: z.string().optional(),
        mitigationNote: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createThreatIndicator({ ...input, userId: ctx.user.id });
        await db.logActivity({ userId: ctx.user.id, action: "threat_added", module: "threats", details: `Dodano zagrożenie: ${input.title} [${input.severity}]`, severity: input.severity === "critical" ? "critical" : "warning" });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        severity: z.enum(["critical", "high", "medium", "low"]).optional(),
        status: z.enum(["active", "mitigated", "false_positive", "monitoring"]).optional(),
        mitigationNote: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateThreatIndicator(id, ctx.user.id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteThreatIndicator(input.id, ctx.user.id)),
    mitigate: protectedProcedure
      .input(z.object({ id: z.number(), note: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateThreatIndicator(input.id, ctx.user.id, {
          status: "mitigated",
          mitigationNote: input.note,
        });
        await db.logActivity({ userId: ctx.user.id, action: "threat_mitigated", module: "threats", details: `Złagodzono zagrożenie ID: ${input.id}`, severity: "info" });
      }),
  }),
});

export type AppRouter = typeof appRouter;

// ─── Seed built-in protocols ──────────────────────────────────────────────────
async function seedBuiltInProtocols(userId: number) {
  const existing = await db.getSecurityProtocols(userId);
  if (existing.length > 0) return { seeded: false };
  const protocols = [
    {
      name: "Air-Gap Isolation",
      category: "air_gap" as const,
      difficulty: "intermediate" as const,
      riskLevel: "low" as const,
      description: "Kompletna izolacja fizyczna urządzenia od sieci. Urządzenie nie posiada żadnych połączeń sieciowych - kabel Ethernet odłączony, WiFi/Bluetooth wyłączone lub usunięte.",
      instructions: "1. Wyłącz wszystkie interfejsy sieciowe (WiFi, Bluetooth, NFC)\n2. Odłącz kabel Ethernet\n3. Rozważ fizyczne usunięcie kart sieciowych\n4. Wyłącz interfejsy w BIOS/UEFI\n5. Regularnie weryfikuj status izolacji",
      requirements: "Urządzenie bez kart sieciowych lub z wyłączonymi interfejsami, fizyczna kontrola dostępu",
      isBuiltIn: true,
      userId,
    },
    {
      name: "Optical Data Bridge (QR)",
      category: "optical" as const,
      difficulty: "beginner" as const,
      riskLevel: "low" as const,
      description: "Transfer danych między urządzeniami air-gap poprzez kody QR wyświetlane na ekranie i skanowane kamerą. Jednokierunkowy kanał danych.",
      instructions: "1. Przygotuj dane do transferu (max 3KB na kod QR)\n2. Wygeneruj kod QR na urządzeniu źródłowym\n3. Zeskanuj kod kamerą urządzenia docelowego\n4. Zweryfikuj integralność danych (hash SHA-256)\n5. Zniszcz tymczasowe pliki po transferze",
      requirements: "Kamera, generator QR, weryfikacja hash",
      isBuiltIn: true,
      userId,
    },
    {
      name: "Faraday Box Protocol",
      category: "physical" as const,
      difficulty: "beginner" as const,
      riskLevel: "low" as const,
      description: "Przechowywanie urządzeń w klatce Faradaya blokującej sygnały elektromagnetyczne. Ochrona przed zdalną eksploatacją i atakami side-channel.",
      instructions: "1. Umieść urządzenie w klatce Faradaya (metalowa siatka/pudełko)\n2. Upewnij się o szczelności połączeń\n3. Przetestuj blokowanie sygnału (brak WiFi/GSM)\n4. Wyjmuj urządzenie tylko gdy konieczne\n5. Dokumentuj każde wyjęcie urządzenia",
      requirements: "Klatka Faradaya, miernik pola EM, dziennik dostępu",
      isBuiltIn: true,
      userId,
    },
    {
      name: "Acoustic Data Bridge",
      category: "acoustic" as const,
      difficulty: "advanced" as const,
      riskLevel: "medium" as const,
      description: "Transfer danych poprzez dźwięk (ultradźwięki lub DTMF). Używany gdy optyczny kanał jest niedostępny. Wymaga specjalistycznego oprogramowania.",
      instructions: "1. Zainstaluj oprogramowanie do kodowania/dekodowania akustycznego\n2. Skalibruj mikrofon i głośnik\n3. Koduj dane jako sygnał akustyczny\n4. Transmituj na częstotliwości ultradźwiękowej (>18kHz)\n5. Weryfikuj integralność po odbiorze",
      requirements: "Mikrofon, głośnik, oprogramowanie akustyczne, izolacja akustyczna pomieszczenia",
      isBuiltIn: true,
      userId,
    },
    {
      name: "Dead Drop Protocol",
      category: "physical" as const,
      difficulty: "intermediate" as const,
      riskLevel: "medium" as const,
      description: "Fizyczny transfer danych przez zaszyfrowane nośniki pozostawiane w umówionym miejscu. Brak bezpośredniego kontaktu między stronami.",
      instructions: "1. Zaszyfruj dane (AES-256) przed zapisem na nośniku\n2. Użyj jednorazowego nośnika (USB)\n3. Pozostaw nośnik w umówionym miejscu\n4. Potwierdź odbiór przez bezpieczny kanał\n5. Zniszcz nośnik po transferze (degauss/fizyczne zniszczenie)",
      requirements: "Zaszyfrowany nośnik USB, fizyczna lokalizacja dead-drop, protokół potwierdzenia",
      isBuiltIn: true,
      userId,
    },
    {
      name: "Network Segmentation",
      category: "network" as const,
      difficulty: "intermediate" as const,
      riskLevel: "medium" as const,
      description: "Separacja sieci na izolowane segmenty (VLAN) z kontrolą przepływu danych między nimi. Minimalizacja powierzchni ataku.",
      instructions: "1. Zidentyfikuj grupy urządzeń wymagające izolacji\n2. Skonfiguruj VLAN dla każdego segmentu\n3. Ustaw reguły firewall między segmentami\n4. Monitoruj ruch między VLAN-ami\n5. Regularnie audytuj reguły segmentacji",
      requirements: "Zarządzalny switch, firewall, wiedza z zakresu sieci",
      isBuiltIn: true,
      userId,
    },
    {
      name: "Full Disk Encryption",
      category: "cryptographic" as const,
      difficulty: "beginner" as const,
      riskLevel: "low" as const,
      description: "Szyfrowanie całego dysku urządzenia (LUKS/BitLocker/VeraCrypt). Ochrona danych w przypadku fizycznej kradzieży urządzenia.",
      instructions: "1. Wybierz narzędzie szyfrowania (LUKS dla Linux, VeraCrypt cross-platform)\n2. Wygeneruj silne hasło (min. 20 znaków, losowe)\n3. Zaszyfruj dysk przed instalacją systemu\n4. Przechowuj klucz odzyskiwania w bezpiecznym miejscu offline\n5. Testuj odzyskiwanie co 6 miesięcy",
      requirements: "VeraCrypt/LUKS/BitLocker, bezpieczne przechowywanie klucza",
      isBuiltIn: true,
      userId,
    },
  ];

  for (const protocol of protocols) {
    await db.createSecurityProtocol(protocol);
  }
  return { seeded: true, count: protocols.length };
}
