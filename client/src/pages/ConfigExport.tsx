import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Download, Upload, Shield, CheckCircle, AlertTriangle, Lock,
  RefreshCw, Key, Hash, Clock, Eye, EyeOff, Trash2, FileText
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

// ─── AES-256-GCM via Web Crypto API ─────────────────────────────────────────
async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptAES(plaintext: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  // Pack: salt(16) + iv(12) + ciphertext
  const packed = new Uint8Array(16 + 12 + ciphertext.byteLength);
  packed.set(salt, 0);
  packed.set(iv, 16);
  packed.set(new Uint8Array(ciphertext), 28);
  let binary = "";
  for (let i = 0; i < packed.length; i++) binary += String.fromCharCode(packed[i]);
  return btoa(binary);
}

async function decryptAES(b64: string, password: string): Promise<string> {
  const raw = atob(b64);
  const packed = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) packed[i] = raw.charCodeAt(i);
  const salt = packed.slice(0, 16);
  const iv = packed.slice(16, 28);
  const ciphertext = packed.slice(28);
  const key = await deriveKey(password, salt);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const arr = new Uint8Array(buf);
  const hex: string[] = [];
  for (let i = 0; i < arr.length; i++) hex.push(arr[i].toString(16).padStart(2, "0"));
  return hex.join("");
}

// ─── Export history (localStorage) ──────────────────────────────────────────
interface ExportRecord {
  id: string;
  date: string;
  filename: string;
  itemCount: number;
  checksum: string;
}

function loadHistory(): ExportRecord[] {
  try { return JSON.parse(localStorage.getItem("cbk_export_history") || "[]"); } catch { return []; }
}
function saveHistory(records: ExportRecord[]) {
  localStorage.setItem("cbk_export_history", JSON.stringify(records.slice(0, 20)));
}

// ─── Password strength ───────────────────────────────────────────────────────
function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 12) score++;
  if (pw.length >= 20) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { score, label: "SŁABE", color: "text-red-400" };
  if (score <= 4) return { score, label: "ŚREDNIE", color: "text-yellow-400" };
  return { score, label: "SILNE", color: "text-green-400" };
}

export default function ConfigExport() {
  const { data: devices = [] } = trpc.devices.list.useQuery();
  const { data: opsecItems = [] } = trpc.opsec.list.useQuery();
  const { data: audits = [] } = trpc.audits.list.useQuery();
  const { data: smartDevices = [] } = trpc.smartHome.list.useQuery();
  const { data: protocols = [] } = trpc.protocols.list.useQuery();

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [importPassword, setImportPassword] = useState("");
  const [showImportPassword, setShowImportPassword] = useState(false);
  const [history, setHistory] = useState<ExportRecord[]>(loadHistory);
  const [lastChecksum, setLastChecksum] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pwStrength = passwordStrength(password);
  const totalItems = devices.length + opsecItems.length + audits.length + smartDevices.length + protocols.length;

  const generateExport = async () => {
    if (!password) { toast.error("Podaj hasło do szyfrowania"); return; }
    if (password.length < 8) { toast.error("Hasło musi mieć min. 8 znaków"); return; }
    setExporting(true);
    try {
      const config = {
        version: "2.0",
        exportedAt: new Date().toISOString(),
        exportedBy: "Cyber Bunker Security Dashboard",
        encryption: "AES-256-GCM / PBKDF2-SHA256 / 310000 iterations",
        data: {
          devices: devices.map(d => ({
            name: d.name, type: d.type, location: d.location,
            isolationStatus: d.isolationStatus, notes: d.notes,
          })),
          opsecItems: opsecItems.map(i => ({
            category: i.category, title: i.title, description: i.description,
            priority: i.priority, isCompleted: i.isCompleted, notes: i.notes,
          })),
          audits: audits.map(a => ({
            title: a.title, description: a.description,
            recurrence: a.recurrence, severity: a.severity, status: a.status,
          })),
          smartDevices: smartDevices.map(d => ({
            name: d.name, protocol: d.protocol, type: d.type,
            location: d.location, automationRule: d.automationRule,
          })),
          protocols: protocols.map(p => ({
            name: p.name, category: p.category, difficulty: p.difficulty,
            riskLevel: p.riskLevel, description: p.description,
          })),
        },
        stats: {
          totalDevices: devices.length,
          opsecCompletion: opsecItems.length > 0
            ? Math.round((opsecItems.filter(i => i.isCompleted).length / opsecItems.length) * 100)
            : 0,
          totalAudits: audits.length,
        },
      };

      const jsonStr = JSON.stringify(config, null, 2);
      const checksum = await sha256(jsonStr);
      const encrypted = await encryptAES(jsonStr, password);

      const pkg = {
        format: "CYBER_BUNKER_CONFIG_V2",
        encrypted: true,
        algorithm: "AES-256-GCM",
        kdf: "PBKDF2-SHA256-310000",
        checksum,
        itemCount: totalItems,
        exportedAt: new Date().toISOString(),
        payload: encrypted,
      };

      const filename = `security-config-${new Date().toISOString().slice(0, 10)}.cbk`;
      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);

      // Save to history
      const record: ExportRecord = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        filename,
        itemCount: totalItems,
        checksum: checksum.slice(0, 16) + "...",
      };
      const newHistory = [record, ...history];
      setHistory(newHistory);
      saveHistory(newHistory);
      setLastChecksum(checksum);

      toast.success(`Konfiguracja wyeksportowana (AES-256-GCM)`, { duration: 5000 });
    } catch (e) {
      toast.error("Błąd eksportu: " + (e as Error).message);
    }
    setExporting(false);
  };

  const handleImport = async (file: File) => {
    if (!importPassword) { toast.error("Podaj hasło do odszyfrowania"); return; }
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const pkg = JSON.parse(text);

      if (!["CYBER_BUNKER_CONFIG_V1", "CYBER_BUNKER_CONFIG_V2"].includes(pkg.format)) {
        toast.error("Nieznany format pliku (.cbk)");
        setImporting(false);
        return;
      }

      let jsonStr: string;
      if (pkg.format === "CYBER_BUNKER_CONFIG_V2") {
        try {
          jsonStr = await decryptAES(pkg.payload, importPassword);
        } catch {
          toast.error("Błędne hasło lub uszkodzony plik");
          setImporting(false);
          return;
        }
        // Verify checksum
        const checksum = await sha256(jsonStr);
        if (checksum !== pkg.checksum) {
          toast.error("Błąd integralności — checksum SHA-256 nie zgadza się!");
          setImporting(false);
          return;
        }
      } else {
        // V1 legacy
        jsonStr = decodeURIComponent(escape(atob(pkg.payload)));
      }

      const config = JSON.parse(jsonStr);
      setImportResult({
        version: config.version,
        exportedAt: config.exportedAt,
        encryption: config.encryption || "Base64 (V1 legacy)",
        devices: config.data.devices.length,
        opsecItems: config.data.opsecItems.length,
        audits: config.data.audits.length,
        smartDevices: config.data.smartDevices.length,
        protocols: config.data.protocols.length,
        opsecCompletion: config.stats?.opsecCompletion,
        checksumOK: pkg.format === "CYBER_BUNKER_CONFIG_V2",
      });

      toast.success(`Import zweryfikowany! ${config.data.devices.length} urządzeń, ${config.data.opsecItems.length} OPSEC`, { duration: 5000 });
    } catch (e) {
      toast.error("Błąd importu: " + (e as Error).message);
    }
    setImporting(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-mono text-foreground tracking-wide">EKSPORT / IMPORT</h1>
        <p className="text-sm text-muted-foreground mt-1">Zaszyfrowane pakiety konfiguracji AES-256-GCM do przesyłu między lokalizacjami</p>
      </div>

      {/* Encryption badge */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-mono text-primary font-semibold">SZYFROWANIE AES-256-GCM (PRAWDZIWE)</p>
          <p className="text-xs text-muted-foreground mt-1">
            Używa Web Crypto API (wbudowane w przeglądarkę). Klucz derywowany przez PBKDF2-SHA256 z 310 000 iteracjami.
            Każdy eksport ma unikalny salt i IV. Checksum SHA-256 weryfikuje integralność przy imporcie.
            Klucz nigdy nie opuszcza przeglądarki.
          </p>
        </div>
      </div>

      {/* Config Summary */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-mono font-semibold text-foreground mb-4">AKTUALNA KONFIGURACJA DO EKSPORTU</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Urządzenia", value: devices.length, color: "text-green-400" },
            { label: "OPSEC Items", value: opsecItems.length, color: "text-blue-400" },
            { label: "Audyty", value: audits.length, color: "text-yellow-400" },
            { label: "Smart Home", value: smartDevices.length, color: "text-purple-400" },
            { label: "Protokoły", value: protocols.length, color: "text-orange-400" },
          ].map(s => (
            <div key={s.label} className="bg-muted/30 rounded-lg p-3 text-center">
              <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 font-mono">Łącznie: {totalItems} elementów</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-mono font-semibold text-foreground">EKSPORT KONFIGURACJI</h2>
          </div>

          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">HASŁO SZYFROWANIA (AES-256-GCM)</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 16 znaków, wielkie/małe litery, cyfry, znaki specjalne..."
                className="w-full bg-input border border-border rounded-lg px-3 py-2 pr-10 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pwStrength.score <= 2 ? "bg-red-400 w-1/3" : pwStrength.score <= 4 ? "bg-yellow-400 w-2/3" : "bg-green-400 w-full"}`} />
                </div>
                <span className={`text-xs font-mono ${pwStrength.color}`}>{pwStrength.label}</span>
              </div>
            )}
          </div>

          <div className="bg-muted/20 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-mono text-muted-foreground">ZAWARTOŚĆ PAKIETU (bez haseł/kluczy):</p>
            {[
              `${devices.length} urządzeń`,
              `${opsecItems.length} elementów OPSEC`,
              `${audits.length} wpisów harmonogramu`,
              `${smartDevices.length} urządzeń Smart Home`,
              `${protocols.length} protokołów`,
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-3 h-3 text-primary" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>

          {lastChecksum && (
            <div className="bg-green-400/5 border border-green-400/20 rounded-lg p-3">
              <p className="text-xs font-mono text-green-400 mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />SHA-256 CHECKSUM
              </p>
              <p className="text-xs font-mono text-muted-foreground break-all">{lastChecksum}</p>
            </div>
          )}

          <Button onClick={generateExport} disabled={exporting || totalItems === 0 || !password} className="w-full font-mono gap-2">
            <Lock className="w-4 h-4" />
            {exporting ? "SZYFROWANIE AES-256-GCM..." : "EKSPORTUJ ZASZYFROWANY PAKIET"}
          </Button>
        </div>

        {/* Import */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-mono font-semibold text-foreground">IMPORT KONFIGURACJI</h2>
          </div>

          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">HASŁO ODSZYFROWANIA</label>
            <div className="relative">
              <input
                type={showImportPassword ? "text" : "password"}
                value={importPassword}
                onChange={e => setImportPassword(e.target.value)}
                placeholder="Hasło użyte przy eksporcie..."
                className="w-full bg-input border border-border rounded-lg px-3 py-2 pr-10 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button onClick={() => setShowImportPassword(!showImportPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showImportPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImport(f); }}>
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Kliknij lub przeciągnij plik .cbk</p>
            <p className="text-xs text-muted-foreground mt-1">Cyber Bunker Config Package V2 (AES-256-GCM)</p>
          </div>
          <input ref={fileRef} type="file" accept=".cbk,.json" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); }} />

          {importing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Odszyfrowywanie AES-256-GCM...
            </div>
          )}

          {importResult && (
            <div className="bg-green-400/5 border border-green-400/20 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <p className="text-xs font-mono text-green-400">IMPORT ZWERYFIKOWANY</p>
                {importResult.checksumOK && (
                  <span className="text-xs font-mono text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                    SHA-256 ✓
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Wersja: </span><span className="font-mono text-foreground">{importResult.version}</span></div>
                <div><span className="text-muted-foreground">Urządzenia: </span><span className="font-mono text-green-400">{importResult.devices}</span></div>
                <div><span className="text-muted-foreground">OPSEC: </span><span className="font-mono text-blue-400">{importResult.opsecItems}</span></div>
                <div><span className="text-muted-foreground">Audyty: </span><span className="font-mono text-yellow-400">{importResult.audits}</span></div>
                <div><span className="text-muted-foreground">Smart Home: </span><span className="font-mono text-purple-400">{importResult.smartDevices}</span></div>
                <div><span className="text-muted-foreground">Protokoły: </span><span className="font-mono text-orange-400">{importResult.protocols}</span></div>
              </div>
              <p className="text-xs text-muted-foreground">
                Szyfrowanie: {importResult.encryption}
              </p>
              <p className="text-xs text-muted-foreground">
                Wyeksportowano: {new Date(importResult.exportedAt).toLocaleString("pl-PL")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Export History */}
      {history.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-mono font-semibold text-foreground">HISTORIA EKSPORTÓW</h2>
            </div>
            <button onClick={() => { setHistory([]); saveHistory([]); }}
              className="text-xs font-mono text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" />Wyczyść
            </button>
          </div>
          <div className="space-y-2">
            {history.map(record => (
              <div key={record.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-mono text-foreground">{record.filename}</p>
                    <p className="text-xs text-muted-foreground">{new Date(record.date).toLocaleString("pl-PL")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-muted-foreground">{record.itemCount} elementów</p>
                  <p className="text-xs font-mono text-muted-foreground/50">{record.checksum}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfer methods */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-mono font-semibold text-foreground">BEZPIECZNY TRANSFER KONFIGURACJI</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { title: "QR Transfer", desc: "Wyślij plik .cbk przez QR Bridge między urządzeniami offline i online. Plik jest już zaszyfrowany AES-256-GCM." },
            { title: "Dead Drop (USB)", desc: "Zaszyfrowany USB z plikiem .cbk pozostawiony w umówionym miejscu. Dodatkowe szyfrowanie VeraCrypt dla USB." },
            { title: "Weryfikacja SHA-256", desc: "Zawsze weryfikuj checksum SHA-256 po odebraniu pliku. Checksum jest automatycznie weryfikowany przy imporcie V2." },
            { title: "Rotacja haseł", desc: "Używaj unikalnego hasła dla każdego eksportu. Nigdy nie używaj tego samego hasła co do logowania." },
          ].map(note => (
            <div key={note.title} className="bg-muted/20 rounded-lg p-3">
              <p className="text-xs font-mono text-primary mb-1">{note.title}</p>
              <p className="text-xs text-muted-foreground">{note.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
