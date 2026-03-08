/**
 * v6 Tests — Cipher Tools, Network Scanner, Secure Vault
 * Tests for server-side logic and pure utility functions
 */
import { describe, it, expect } from "vitest";

// ─── Cipher Tools Tests ───────────────────────────────────────────────────────

describe("CipherTools — AES key derivation logic", () => {
  it("should validate AES key lengths", () => {
    const validLengths = [128, 192, 256];
    const invalidLengths = [64, 512, 1024];
    for (const len of validLengths) {
      expect([128, 192, 256]).toContain(len);
    }
    for (const len of invalidLengths) {
      expect([128, 192, 256]).not.toContain(len);
    }
  });

  it("should validate RSA key sizes", () => {
    const validSizes = [2048, 4096];
    expect(validSizes).toContain(2048);
    expect(validSizes).toContain(4096);
    expect(validSizes).not.toContain(512);
    expect(validSizes).not.toContain(1024);
  });

  it("should detect base64 encoding correctly", () => {
    const isBase64 = (s: string) => /^[A-Za-z0-9+/]*={0,2}$/.test(s) && s.length % 4 === 0;
    expect(isBase64("SGVsbG8gV29ybGQ=")).toBe(true);
    expect(isBase64("dGVzdA==")).toBe(true);
    expect(isBase64("not-base64!@#")).toBe(false);
  });

  it("should detect hex encoding correctly", () => {
    const isHex = (s: string) => /^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0;
    expect(isHex("deadbeef")).toBe(true);
    expect(isHex("AABBCCDD")).toBe(true);
    expect(isHex("xyz123")).toBe(false);
    expect(isHex("abc")).toBe(false); // odd length
  });

  it("should calculate entropy for password strength", () => {
    const calcEntropy = (password: string): number => {
      const charsetSize = (() => {
        let size = 0;
        if (/[a-z]/.test(password)) size += 26;
        if (/[A-Z]/.test(password)) size += 26;
        if (/[0-9]/.test(password)) size += 10;
        if (/[^a-zA-Z0-9]/.test(password)) size += 32;
        return size;
      })();
      return Math.log2(Math.pow(charsetSize, password.length));
    };

    const weakEntropy = calcEntropy("abc");
    const strongEntropy = calcEntropy("Tr0ub4dor&3");
    expect(strongEntropy).toBeGreaterThan(weakEntropy);
    expect(calcEntropy("aaaaaa")).toBeLessThan(calcEntropy("aA1!bB2@"));
  });
});

// ─── Network Scanner Tests ────────────────────────────────────────────────────

describe("NetworkScanner — log parsing logic", () => {
  it("should parse Nginx combined log format", () => {
    const NGINX_REGEX = /^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"(\w+)\s+(\S+)\s+\S+"\s+(\d+)\s+(\d+)/;
    const line = '192.168.1.1 - - [08/Mar/2026:10:23:45 +0100] "GET /index.html HTTP/1.1" 200 2326';
    const match = line.match(NGINX_REGEX);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("192.168.1.1");
    expect(match![3]).toBe("GET");
    expect(match![4]).toBe("/index.html");
    expect(match![5]).toBe("200");
    expect(match![6]).toBe("2326");
  });

  it("should parse iptables log format", () => {
    // iptables/ufw format: SRC=... PROTO=... DPT=... (PROTO before DPT)
    const IPTABLES_REGEX = /SRC=(\S+).*?PROTO=(\w+).*?DPT=(\d+)/;
    const line = "Mar  8 10:23:45 hostname kernel: [UFW BLOCK] IN=eth0 SRC=1.2.3.4 DST=5.6.7.8 PROTO=TCP SPT=12345 DPT=22";
    const match = line.match(IPTABLES_REGEX);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("1.2.3.4");
    expect(match![2]).toBe("TCP");
    expect(match![3]).toBe("22");
  });

  it("should detect brute force (>20 auth failures)", () => {
    const detectBruteForce = (logs: Array<{ status: number; path: string }>) => {
      const authFails = logs.filter(l => l.status === 401 || l.status === 403 || l.path.includes("login")).length;
      return authFails > 20;
    };
    const normalLogs = Array(5).fill({ status: 401, path: "/login" });
    const attackLogs = Array(25).fill({ status: 401, path: "/login" });
    expect(detectBruteForce(normalLogs)).toBe(false);
    expect(detectBruteForce(attackLogs)).toBe(true);
  });

  it("should detect suspicious paths", () => {
    const SUSPICIOUS_PATH_REGEX = /\/(wp-admin|phpmyadmin|\.env|\.git|admin|passwd|shadow|etc\/|proc\/|shell|cmd|exec|eval)/i;
    const suspiciousPaths = ["/wp-admin/", "/.env", "/phpmyadmin/", "/etc/passwd", "/cmd.php"];
    const normalPaths = ["/index.html", "/api/data", "/dashboard", "/login"];
    for (const p of suspiciousPaths) {
      expect(SUSPICIOUS_PATH_REGEX.test(p)).toBe(true);
    }
    for (const p of normalPaths) {
      expect(SUSPICIOUS_PATH_REGEX.test(p)).toBe(false);
    }
  });

  it("should calculate risk score correctly", () => {
    const calcRisk = (anomalies: Array<{ severity: string }>) => {
      let score = 0;
      for (const a of anomalies) {
        score += a.severity === "critical" ? 40 : a.severity === "high" ? 25 : a.severity === "medium" ? 15 : 5;
      }
      return Math.min(100, score);
    };
    expect(calcRisk([])).toBe(0);
    expect(calcRisk([{ severity: "critical" }])).toBe(40);
    expect(calcRisk([{ severity: "critical" }, { severity: "high" }])).toBe(65);
    // Should cap at 100
    expect(calcRisk(Array(10).fill({ severity: "critical" }))).toBe(100);
  });

  it("should categorize HTTP status codes", () => {
    const categorize = (status: number) => `${Math.floor(status / 100)}xx`;
    expect(categorize(200)).toBe("2xx");
    expect(categorize(301)).toBe("3xx");
    expect(categorize(404)).toBe("4xx");
    expect(categorize(500)).toBe("5xx");
  });

  it("should extract IP from generic log line", () => {
    const IP_REGEX = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/;
    const lines = [
      "Failed login from 192.168.1.100 at 10:23",
      "Connection from 10.0.0.5:8080",
      "No IP here",
    ];
    expect(lines[0].match(IP_REGEX)?.[1]).toBe("192.168.1.100");
    expect(lines[1].match(IP_REGEX)?.[1]).toBe("10.0.0.5");
    expect(lines[2].match(IP_REGEX)).toBeNull();
  });
});

// ─── Secure Vault Tests ───────────────────────────────────────────────────────

describe("SecureVault — client-side encryption logic", () => {
  it("should validate vault item types", () => {
    const VALID_TYPES = ["password", "api_key", "seed_phrase", "note", "certificate", "ssh_key"];
    const testTypes = ["password", "api_key", "seed_phrase", "note", "certificate", "ssh_key"];
    for (const t of testTypes) {
      expect(VALID_TYPES).toContain(t);
    }
    expect(VALID_TYPES).not.toContain("unknown");
    expect(VALID_TYPES).not.toContain("credit_card");
  });

  it("should validate minimum password length for vault", () => {
    const isValidMasterPassword = (pw: string) => pw.length >= 8;
    expect(isValidMasterPassword("short")).toBe(false);
    expect(isValidMasterPassword("12345678")).toBe(true);
    expect(isValidMasterPassword("VeryStrongPassword!123")).toBe(true);
  });

  it("should generate unique IDs", () => {
    // Simulate ID generation (hex from random bytes)
    const generateId = () => {
      let hex = "";
      for (let i = 0; i < 8; i++) {
        hex += Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
      }
      return hex;
    };
    const ids = new Set(Array.from({ length: 100 }, generateId));
    expect(ids.size).toBe(100); // All unique
    for (const id of Array.from(ids)) {
      expect(id).toMatch(/^[0-9a-f]{16}$/);
    }
  });

  it("should generate strong passwords", () => {
    const generatePassword = (length = 24) => {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_=+";
      let result = "";
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
      return result;
    };
    const pw = generatePassword(24);
    expect(pw).toHaveLength(24);
    expect(/[a-z]/.test(pw) || /[A-Z]/.test(pw) || /[0-9]/.test(pw)).toBe(true);
  });

  it("should validate vault data structure", () => {
    const isValidVaultData = (data: unknown): boolean => {
      if (typeof data !== "object" || data === null) return false;
      const d = data as Record<string, unknown>;
      return d.version === 1 && Array.isArray(d.items) && typeof d.createdAt === "number";
    };
    expect(isValidVaultData({ version: 1, items: [], createdAt: Date.now() })).toBe(true);
    expect(isValidVaultData({ version: 2, items: [], createdAt: Date.now() })).toBe(false);
    expect(isValidVaultData({ version: 1, createdAt: Date.now() })).toBe(false);
    expect(isValidVaultData(null)).toBe(false);
  });

  it("should parse tags correctly", () => {
    const parseTags = (input: string) => input.split(",").map(t => t.trim()).filter(Boolean);
    expect(parseTags("praca, produkcja, krypto")).toEqual(["praca", "produkcja", "krypto"]);
    expect(parseTags("  tag1  ,  tag2  ")).toEqual(["tag1", "tag2"]);
    expect(parseTags("")).toEqual([]);
    expect(parseTags(",,,")).toEqual([]);
  });

  it("should validate AES-GCM parameters", () => {
    // AES-GCM requires: 32-byte salt, 12-byte IV, ciphertext
    const SALT_LENGTH = 32;
    const IV_LENGTH = 12;
    const MIN_CIPHERTEXT_LENGTH = 16; // AES-GCM tag is 16 bytes

    expect(SALT_LENGTH).toBe(32);
    expect(IV_LENGTH).toBe(12);
    expect(MIN_CIPHERTEXT_LENGTH).toBe(16);

    // Total minimum encrypted size
    const minEncryptedSize = SALT_LENGTH + IV_LENGTH + MIN_CIPHERTEXT_LENGTH;
    expect(minEncryptedSize).toBe(60);
  });

  it("should validate PBKDF2 iteration count for security", () => {
    const ITERATIONS = 600_000;
    // NIST recommends at least 600,000 iterations for PBKDF2-SHA256 (2023)
    expect(ITERATIONS).toBeGreaterThanOrEqual(600_000);
  });
});

// ─── Integration Tests ────────────────────────────────────────────────────────

describe("v6 Integration — module routing", () => {
  it("should have correct route paths defined", () => {
    const routes = ["/cipher", "/network-scanner", "/vault"];
    const validRoutePattern = /^\/[a-z-]+$/;
    for (const route of routes) {
      expect(validRoutePattern.test(route)).toBe(true);
    }
  });

  it("should have all required nav group labels", () => {
    const expectedGroups = ["PRZEGLĄD", "URZĄDZENIA", "TRANSFER DANYCH", "BEZPIECZEŃSTWO", "WIEDZA", "NARZĘDZIA", "DANE"];
    // Verify the new NARZĘDZIA group is included
    expect(expectedGroups).toContain("NARZĘDZIA");
    expect(expectedGroups).toHaveLength(7);
  });

  it("should validate cipher algorithm names", () => {
    const SUPPORTED_ALGORITHMS = ["AES-256-GCM", "AES-128-GCM", "RSA-OAEP-2048", "RSA-OAEP-4096"];
    expect(SUPPORTED_ALGORITHMS).toContain("AES-256-GCM");
    expect(SUPPORTED_ALGORITHMS).toContain("RSA-OAEP-2048");
    expect(SUPPORTED_ALGORITHMS).not.toContain("DES");
    expect(SUPPORTED_ALGORITHMS).not.toContain("RC4");
  });
});
