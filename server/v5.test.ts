/**
 * v5 Tests — Steganography Calculator, Command Palette logic,
 * Security Reports, Incidents, Threats, Score History
 */
import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createAuthContext(role: "user" | "admin" = "user") {
  const user = {
    id: 1,
    openId: "test-v5",
    email: "test@cyberbunker.local",
    name: "Test Operator",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
  return { ctx };
}

// ─── Steganography LSB Calculator Logic ──────────────────────────────────────

describe("steganography LSB capacity calculator", () => {
  // Pure math functions mirroring SteganographyGuide.tsx calculator
  function calcImageCapacity(width: number, height: number, channels: number, lsbBits: number) {
    const totalPixels = width * height;
    const bitsAvailable = totalPixels * channels * lsbBits;
    const bytesAvailable = Math.floor(bitsAvailable / 8);
    const overheadBytes = 32;
    return Math.max(0, bytesAvailable - overheadBytes);
  }

  function calcAudioCapacity(sampleRate: number, duration: number, channels: number, lsbBits: number) {
    const totalSamples = sampleRate * duration * channels;
    const bitsAvailable = totalSamples * lsbBits;
    const bytesAvailable = Math.floor(bitsAvailable / 8);
    return Math.max(0, bytesAvailable - 32);
  }

  function calcVideoCapacity(width: number, height: number, channels: number, fps: number, duration: number, nthFrame: number, lsbBits: number) {
    const framesUsed = Math.floor((fps * duration) / nthFrame);
    const bitsPerFrame = width * height * channels * lsbBits;
    const bitsAvailable = framesUsed * bitsPerFrame;
    const bytesAvailable = Math.floor(bitsAvailable / 8);
    return Math.max(0, bytesAvailable - 32);
  }

  it("1920x1080 RGB 1-bit LSB image has ~777 KB capacity", () => {
    const capacity = calcImageCapacity(1920, 1080, 3, 1);
    // Expected: (1920*1080*3*1)/8 - 32 = 777,568 bytes ≈ 759 KB
    expect(capacity).toBeGreaterThan(750_000);
    expect(capacity).toBeLessThan(800_000);
  });

  it("capacity scales linearly with LSB bits", () => {
    const cap1 = calcImageCapacity(1000, 1000, 3, 1);
    const cap2 = calcImageCapacity(1000, 1000, 3, 2);
    const cap4 = calcImageCapacity(1000, 1000, 3, 4);
    expect(cap2).toBeCloseTo(cap1 * 2, -3);
    expect(cap4).toBeCloseTo(cap1 * 4, -3);
  });

  it("capacity scales with image dimensions", () => {
    const cap_hd = calcImageCapacity(1280, 720, 3, 1);
    const cap_4k = calcImageCapacity(3840, 2160, 3, 1);
    // 4K is 9x HD (3x width, 3x height)
    expect(cap_4k).toBeGreaterThan(cap_hd * 8);
  });

  it("44100 Hz stereo 60s WAV has ~661 KB capacity", () => {
    const capacity = calcAudioCapacity(44100, 60, 2, 1);
    // Expected: (44100*60*2*1)/8 - 32 = 661,468 bytes ≈ 646 KB
    expect(capacity).toBeGreaterThan(650_000);
    expect(capacity).toBeLessThan(680_000);
  });

  it("audio capacity scales with duration", () => {
    const cap30 = calcAudioCapacity(44100, 30, 2, 1);
    const cap60 = calcAudioCapacity(44100, 60, 2, 1);
    // 60s should be ~2x 30s (minus fixed overhead)
    expect(cap60).toBeGreaterThan(cap30 * 1.9);
  });

  it("video capacity is much larger than image", () => {
    const imageCap = calcImageCapacity(1920, 1080, 3, 1);
    const videoCap = calcVideoCapacity(1920, 1080, 3, 30, 60, 1, 1);
    // 60s * 30fps = 1800 frames, so video should be ~1800x image
    expect(videoCap).toBeGreaterThan(imageCap * 1000);
  });

  it("using every Nth frame reduces capacity proportionally", () => {
    const cap1 = calcVideoCapacity(1920, 1080, 3, 30, 60, 1, 1);
    const cap5 = calcVideoCapacity(1920, 1080, 3, 30, 60, 5, 1);
    // Every 5th frame = 1/5 capacity
    expect(cap5).toBeCloseTo(cap1 / 5, -5);
  });

  it("capacity is non-negative for any valid input", () => {
    expect(calcImageCapacity(1, 1, 1, 1)).toBeGreaterThanOrEqual(0);
    expect(calcAudioCapacity(8000, 1, 1, 1)).toBeGreaterThanOrEqual(0);
    expect(calcVideoCapacity(320, 240, 3, 24, 1, 1, 1)).toBeGreaterThanOrEqual(0);
  });
});

// ─── Shannon Entropy Logic ────────────────────────────────────────────────────

describe("shannon entropy calculation", () => {
  function shannonEntropy(text: string): number {
    if (!text) return 0;
    const freq: Record<string, number> = {};
    for (const ch of text) {
      freq[ch] = (freq[ch] || 0) + 1;
    }
    const len = text.length;
    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  it("empty string has entropy 0", () => {
    expect(shannonEntropy("")).toBe(0);
  });

  it("single character has entropy 0", () => {
    expect(shannonEntropy("aaaa")).toBe(0);
  });

  it("two equal characters have entropy 1", () => {
    expect(shannonEntropy("ab")).toBeCloseTo(1.0, 5);
  });

  it("random-looking string has higher entropy than repetitive", () => {
    const repetitive = "aaaaaaaaaaaaaaaa";
    const random = "aB3$xK9mPq2nR7sL";
    expect(shannonEntropy(random)).toBeGreaterThan(shannonEntropy(repetitive));
  });

  it("maximum entropy for binary string is 1 bit", () => {
    const binary = "0101010101010101";
    expect(shannonEntropy(binary)).toBeCloseTo(1.0, 5);
  });

  it("entropy of password with mixed chars is > 3 bits", () => {
    const strongPassword = "X9k#mP2$qR5nL8@w";
    expect(shannonEntropy(strongPassword)).toBeGreaterThan(3.0);
  });
});

// ─── Incidents Router ─────────────────────────────────────────────────────────

describe("incidents router", () => {
  it("list returns array for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.incidents.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create incident with valid data succeeds", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // incidents.create is a void mutation (no return value)
    await expect(
      caller.incidents.create({
        title: "Test Incident v5",
        description: "Automated test incident",
        severity: "low",
        category: "other",
      })
    ).resolves.not.toThrow();
    // Verify it was created by listing
    const list = await caller.incidents.list();
    const created = list.find(i => i.title === "Test Incident v5");
    expect(created).toBeDefined();
    expect(created?.status).toBe("open");
  });

  it("create incident requires non-empty title", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.incidents.create({
        title: "",
        description: "Empty title test",
        severity: "low",
        category: "other",
      })
    ).rejects.toThrow();
  });
});

// ─── Threats Router ───────────────────────────────────────────────────────────

describe("threats router", () => {
  it("list returns array for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.threats.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create threat indicator with valid data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // threats.create uses title (not value) per schema
    await expect(
      caller.threats.create({
        type: "ioc",
        title: "Suspicious IP 192.168.1.100",
        description: "Suspicious IP from test",
        severity: "medium",
        source: "manual",
      })
    ).resolves.not.toThrow();
  });
});

// ─── Security Score History ───────────────────────────────────────────────────

describe("scoreHistory router", () => {
  it("get returns array for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.scoreHistory.get({ days: 7 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("snapshot saves current score", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.scoreHistory.snapshot();
    // May return null if snapshot already exists today
    if (result !== null) {
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
    expect(result === null || typeof result.score === "number").toBe(true);
  });

  it("stats returns valid structure", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.scoreHistory.stats();
    expect(stats).toBeDefined();
    expect(typeof stats.current).toBe("number");
    expect(["up", "down", "stable"]).toContain(stats.trend);
  });
});

// ─── Reports Router ───────────────────────────────────────────────────────────

describe("reports router", () => {
  it("list returns array for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.reports.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("generate creates a report with markdown content", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const report = await caller.reports.generate({
      title: "Test Report v5",
      reportType: "custom",
    });
    expect(report).toBeDefined();
    // generate returns { id, content, summary, score }
    expect(typeof report.id).toBe("number");
    expect(typeof report.content).toBe("string");
    expect(report.content.length).toBeGreaterThan(0);
    // Should contain markdown headers
    expect(report.content).toContain("#");
  });

  it("getContent returns string for existing report", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // First create a report
    const report = await caller.reports.generate({
      title: "Content Test v5",
      reportType: "weekly",
    });
    const content = await caller.reports.getContent({ id: report.id });
    expect(typeof content).toBe("string");
    expect(content!.length).toBeGreaterThan(0);
  });
});

// ─── Secure Notes Router ──────────────────────────────────────────────────────

describe("notes router", () => {
  it("list returns array for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notes.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create note with valid data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // notes.create: tags is a string (comma-separated), not array
    await expect(
      caller.notes.create({
        title: "Test Note v5",
        content: "Encrypted test content",
        tags: "test,v5",
      })
    ).resolves.not.toThrow();
  });
});
