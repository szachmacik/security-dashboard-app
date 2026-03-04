import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { seedDefaultData } from "./seed";

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

  // ─── Devices ────────────────────────────────────────────────────────────────
  devices: router({
    list: protectedProcedure.query(({ ctx }) => db.getDevices(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) =>
      db.getDevice(input.id, ctx.user.id)
    ),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["laptop", "phone", "tablet", "server", "raspberry_pi", "usb_drive", "other"]),
        location: z.string().optional(),
        isolationStatus: z.enum(["air_gapped", "faraday", "offline", "online"]),
        notes: z.string().optional(),
      }))
      .mutation(({ ctx, input }) =>
        db.createDevice({ ...input, userId: ctx.user.id })
      ),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        type: z.enum(["laptop", "phone", "tablet", "server", "raspberry_pi", "usb_drive", "other"]).optional(),
        location: z.string().optional(),
        isolationStatus: z.enum(["air_gapped", "faraday", "offline", "online"]).optional(),
        isActive: z.boolean().optional(),
        lastSync: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateDevice(id, ctx.user.id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteDevice(input.id, ctx.user.id)),
    syncNow: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) =>
        db.updateDevice(input.id, ctx.user.id, { lastSync: new Date() })
      ),
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
      }))
      .mutation(({ ctx, input }) =>
        db.createOpsecItem({ ...input, userId: ctx.user.id })
      ),
    toggle: protectedProcedure
      .input(z.object({ id: z.number(), isCompleted: z.boolean() }))
      .mutation(({ ctx, input }) =>
        db.updateOpsecItem(input.id, ctx.user.id, {
          isCompleted: input.isCompleted,
          completedAt: input.isCompleted ? new Date() : null,
        })
      ),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        priority: z.enum(["critical", "high", "medium", "low"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateOpsecItem(id, ctx.user.id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteOpsecItem(input.id, ctx.user.id)),
    seed: protectedProcedure.mutation(({ ctx }) => seedDefaultData(ctx.user.id)),
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
      .mutation(({ ctx, input }) =>
        db.createAudit({ ...input, userId: ctx.user.id })
      ),
    complete: protectedProcedure
      .input(z.object({ id: z.number(), findings: z.string().optional() }))
      .mutation(({ ctx, input }) =>
        db.updateAudit(input.id, ctx.user.id, {
          status: "completed",
          completedAt: new Date(),
          findings: input.findings,
        })
      ),
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
      .mutation(({ ctx, input }) =>
        db.createTransferSession({ ...input, userId: ctx.user.id })
      ),
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
      .mutation(({ ctx, input }) =>
        db.createSmartHomeDevice({ ...input, userId: ctx.user.id })
      ),
    toggle: protectedProcedure
      .input(z.object({ id: z.number(), isPowered: z.boolean() }))
      .mutation(({ ctx, input }) =>
        db.updateSmartHomeDevice(input.id, ctx.user.id, { isPowered: input.isPowered })
      ),
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
      .mutation(({ ctx, input }) =>
        db.createSecureNote({ ...input, userId: ctx.user.id })
      ),
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
      instructions: "1. Wyłącz wszystkie interfejsy sieciowe (WiFi, Bluetooth, Ethernet)\n2. Jeśli możliwe - fizycznie usuń karty sieciowe\n3. Wyłącz USB (lub użyj USB Condom dla zasilania)\n4. Zainstaluj system operacyjny z nośnika offline\n5. Regularnie weryfikuj izolację przez skanowanie RF\n6. Przechowuj w klatce Faradaya gdy nieużywane",
      requirements: "Laptop/PC bez wbudowanego WiFi lub z możliwością jego wyłączenia, Klatka Faradaya (opcjonalnie), RF Scanner do weryfikacji",
      isBuiltIn: true,
    },
    {
      name: "Optyczny Most Danych (QR Bridge)",
      category: "optical" as const,
      difficulty: "advanced" as const,
      riskLevel: "medium" as const,
      description: "Transfer danych między urządzeniami air-gap przez kody QR wyświetlane na ekranie i skanowane kamerą. Eliminuje fizyczny kontakt między urządzeniami.",
      instructions: "1. Na urządzeniu źródłowym: zakoduj dane jako QR (max 2953 bajtów/QR)\n2. Wyświetl kod QR na ekranie urządzenia offline\n3. Na urządzeniu docelowym: użyj kamery do skanowania\n4. Weryfikuj integralność danych przez hash SHA-256\n5. Dla większych danych: użyj sekwencji QR z numeracją\n6. Nigdy nie skanuj QR z niezaufanych źródeł",
      requirements: "Kamera (wbudowana lub USB), Oprogramowanie do generowania/skanowania QR, Algorytm weryfikacji integralności",
      isBuiltIn: true,
    },
    {
      name: "Klatka Faradaya",
      category: "physical" as const,
      difficulty: "beginner" as const,
      riskLevel: "low" as const,
      description: "Metalowa obudowa blokująca sygnały elektromagnetyczne. Chroni urządzenie przed zdalnym podsłuchem, atakami TEMPEST i nieautoryzowaną komunikacją bezprzewodową.",
      instructions: "1. Użyj metalowego pojemnika (stal, aluminium, miedź)\n2. Upewnij się że nie ma szczelin > 1/10 długości fali\n3. Testuj skuteczność: umieść telefon w środku i zadzwoń\n4. Dla laptopów: specjalne torby Faradaya lub metalowe skrzynki\n5. Pamiętaj: klatka Faradaya nie chroni przed atakami przez przewody\n6. Regularnie sprawdzaj integralność klatki",
      requirements: "Metalowy pojemnik lub torba Faradaya, Tester RF lub telefon do weryfikacji, Uszczelki przewodzące dla pokryw",
      isBuiltIn: true,
    },
    {
      name: "Dead Drop Protocol",
      category: "physical" as const,
      difficulty: "intermediate" as const,
      riskLevel: "medium" as const,
      description: "Wymiana danych przez fizyczny nośnik (USB, karta SD) pozostawiony w umówionym miejscu. Eliminuje bezpośredni kontakt między stronami wymiany.",
      instructions: "1. Użyj zaszyfrowanego nośnika (VeraCrypt, BitLocker)\n2. Umów z góry lokalizację dead drop\n3. Użyj jednorazowych nośników gdy możliwe\n4. Weryfikuj nośnik przed użyciem (skanowanie AV w izolacji)\n5. Używaj USB Condom przy pierwszym podłączeniu\n6. Zniszcz nośnik po jednorazowym użyciu",
      requirements: "Zaszyfrowany nośnik USB, USB Condom/bloker danych, Oprogramowanie do weryfikacji integralności, Bezpieczna lokalizacja dead drop",
      isBuiltIn: true,
    },
    {
      name: "Akustyczny Most Danych",
      category: "acoustic" as const,
      difficulty: "expert" as const,
      riskLevel: "high" as const,
      description: "Transfer danych przez dźwięk (ultradźwięki lub słyszalne tony). Eksperymentalna metoda dla ekstremalnych scenariuszy izolacji. Prędkość: ~100-200 bajtów/s.",
      instructions: "1. Użyj biblioteki jak GGWAVE lub własnej implementacji\n2. Koduj dane jako sekwencje tonów (FSK/OFDM)\n3. Mikrofon odbiornika musi być w odległości < 5m\n4. Unikaj hałaśliwego otoczenia\n5. Weryfikuj każdy pakiet przez CRC\n6. Szyfruj dane przed transmisją akustyczną",
      requirements: "Głośnik (nadajnik), Mikrofon (odbiornik), Biblioteka GGWAVE lub podobna, Ciche otoczenie",
      isBuiltIn: true,
    },
    {
      name: "Kill Switch USB",
      category: "physical" as const,
      difficulty: "beginner" as const,
      riskLevel: "low" as const,
      description: "Fizyczny przełącznik podłączony do USB inicjujący natychmiastowe szyfrowanie/wyłączenie systemu. Ochrona przed nieautoryzowanym dostępem fizycznym.",
      instructions: "1. Skonfiguruj skrypt wywoływany przez udev przy odłączeniu USB\n2. Skrypt: natychmiastowe szyfrowanie RAM (TRESOR), wyłączenie\n3. Alternatywnie: USBKill - urządzenie generujące ładunek elektryczny\n4. Testuj regularnie w kontrolowanych warunkach\n5. Noś klucz USB zawsze przy sobie\n6. Skonfiguruj też softwarowy kill switch (hotkey)",
      requirements: "USB drive (klucz), Skrypt udev (Linux) lub AutoRun (Windows), Opcjonalnie: USBKill hardware",
      isBuiltIn: true,
    },
  ];

  for (const protocol of protocols) {
    await db.createSecurityProtocol({ ...protocol, userId });
  }
}
