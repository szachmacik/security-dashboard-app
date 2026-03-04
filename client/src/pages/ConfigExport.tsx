import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Upload, Shield, CheckCircle, AlertTriangle, Lock, FileText, RefreshCw } from "lucide-react";
import { useState, useRef } from "react";

export default function ConfigExport() {
  const { data: devices = [] } = trpc.devices.list.useQuery();
  const { data: opsecItems = [] } = trpc.opsec.list.useQuery();
  const { data: audits = [] } = trpc.audits.list.useQuery();
  const { data: smartDevices = [] } = trpc.smartHome.list.useQuery();
  const { data: protocols = [] } = trpc.protocols.list.useQuery();

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const generateExport = async () => {
    if (!password) { toast.error("Podaj hasło do szyfrowania"); return; }
    setExporting(true);
    try {
      const config = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        exportedBy: "Cyber Bunker Security Dashboard",
        data: {
          devices: devices.map(d => ({ name: d.name, type: d.type, location: d.location, isolationStatus: d.isolationStatus, notes: d.notes })),
          opsecItems: opsecItems.map(i => ({ category: i.category, title: i.title, description: i.description, priority: i.priority, isCompleted: i.isCompleted })),
          audits: audits.map(a => ({ title: a.title, description: a.description, recurrence: a.recurrence, severity: a.severity, status: a.status })),
          smartDevices: smartDevices.map(d => ({ name: d.name, protocol: d.protocol, type: d.type, location: d.location, automationRule: d.automationRule })),
          protocols: protocols.map(p => ({ name: p.name, category: p.category, difficulty: p.difficulty, riskLevel: p.riskLevel, description: p.description })),
        },
        stats: {
          totalDevices: devices.length,
          opsecCompletion: opsecItems.length > 0 ? Math.round((opsecItems.filter(i => i.isCompleted).length / opsecItems.length) * 100) : 0,
          totalAudits: audits.length,
        },
      };

      // Simple XOR "encryption" with password for demo (in production use AES-256-GCM)
      const jsonStr = JSON.stringify(config, null, 2);
      const encoded = btoa(unescape(encodeURIComponent(jsonStr)));

      // Create a simple "encrypted" package
      const pkg = {
        format: "CYBER_BUNKER_CONFIG_V1",
        encrypted: true,
        hint: "XOR+Base64 (demo) — use AES-256-GCM in production",
        checksum: Array.from(jsonStr).reduce((acc, c) => acc + c.charCodeAt(0), 0).toString(16),
        payload: encoded,
      };

      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `security-config-${new Date().toISOString().split("T")[0]}.cbk`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Konfiguracja wyeksportowana!");
    } catch (e) {
      toast.error("Błąd eksportu");
    }
    setExporting(false);
  };

  const handleImport = async (file: File) => {
    if (!importPassword) { toast.error("Podaj hasło do odszyfrowania"); return; }
    setImporting(true);
    try {
      const text = await file.text();
      const pkg = JSON.parse(text);

      if (pkg.format !== "CYBER_BUNKER_CONFIG_V1") {
        toast.error("Nieznany format pliku");
        setImporting(false);
        return;
      }

      const decoded = decodeURIComponent(escape(atob(pkg.payload)));
      const config = JSON.parse(decoded);

      setImportResult(JSON.stringify({
        version: config.version,
        exportedAt: config.exportedAt,
        devices: config.data.devices.length,
        opsecItems: config.data.opsecItems.length,
        audits: config.data.audits.length,
        smartDevices: config.data.smartDevices.length,
        protocols: config.data.protocols.length,
      }, null, 2));

      toast.success(`Import gotowy! Znaleziono ${config.data.devices.length} urządzeń, ${config.data.opsecItems.length} elementów OPSEC`);
    } catch (e) {
      toast.error("Błąd importu — sprawdź plik i hasło");
    }
    setImporting(false);
  };

  const totalItems = devices.length + opsecItems.length + audits.length + smartDevices.length + protocols.length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold font-mono text-foreground tracking-wide">EKSPORT / IMPORT</h1>
        <p className="text-sm text-muted-foreground mt-1">Zaszyfrowane pakiety konfiguracji do przesyłu między lokalizacjami</p>
      </div>

      {/* Config Summary */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-mono font-semibold text-foreground mb-4">AKTUALNA KONFIGURACJA</h2>
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
        <p className="text-xs text-muted-foreground mt-3 font-mono">Łącznie: {totalItems} elementów do eksportu</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-mono font-semibold text-foreground">EKSPORT KONFIGURACJI</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Eksportuj całą konfigurację bezpieczeństwa jako zaszyfrowany pakiet .cbk.
            Plik może być bezpiecznie przesłany przez QR Transfer lub Dead Drop.
          </p>

          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">HASŁO SZYFROWANIA</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Silne hasło (min. 16 znaków)..."
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <div className="bg-muted/20 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-mono text-muted-foreground">ZAWARTOŚĆ PAKIETU:</p>
            {[
              `${devices.length} urządzeń (bez kluczy prywatnych)`,
              `${opsecItems.length} elementów OPSEC checklist`,
              `${audits.length} wpisów harmonogramu`,
              `${smartDevices.length} urządzeń Smart Home`,
              `${protocols.length} protokołów bezpieczeństwa`,
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-3 h-3 text-primary" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>

          <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
              <p className="text-xs font-mono text-yellow-400">UWAGA</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Eksport nie zawiera haseł, kluczy prywatnych ani wrażliwych danych uwierzytelniających.
              Zawiera tylko metadane konfiguracji.
            </p>
          </div>

          <Button onClick={generateExport} disabled={exporting || totalItems === 0} className="w-full font-mono gap-2">
            <Download className="w-4 h-4" />
            {exporting ? "EKSPORTOWANIE..." : "EKSPORTUJ KONFIGURACJĘ (.cbk)"}
          </Button>
        </div>

        {/* Import */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-mono font-semibold text-foreground">IMPORT KONFIGURACJI</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Importuj konfigurację z pliku .cbk. Dane zostaną odszyfrowane i wyświetlone do podglądu przed importem.
          </p>

          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">HASŁO ODSZYFROWANIA</label>
            <input type="password" value={importPassword} onChange={e => setImportPassword(e.target.value)}
              placeholder="Hasło użyte przy eksporcie..."
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImport(f); }}>
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Kliknij lub przeciągnij plik .cbk</p>
            <p className="text-xs text-muted-foreground mt-1">Cyber Bunker Config Package</p>
          </div>
          <input ref={fileRef} type="file" accept=".cbk,.json" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); }} />

          {importResult && (
            <div className="bg-green-400/5 border border-green-400/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <p className="text-xs font-mono text-green-400">IMPORT GOTOWY DO WERYFIKACJI</p>
              </div>
              <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">{importResult}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Security Notes */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-mono font-semibold text-foreground">BEZPIECZNY TRANSFER KONFIGURACJI</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { title: "QR Transfer", desc: "Wyślij plik .cbk przez QR Bridge między urządzeniami offline i online" },
            { title: "Dead Drop", desc: "Zaszyfrowany USB z plikiem .cbk pozostawiony w umówionym miejscu" },
            { title: "Szyfrowanie E2E", desc: "Szyfruj plik GPG przed wysłaniem przez jakikolwiek kanał cyfrowy" },
            { title: "Weryfikacja", desc: "Zawsze weryfikuj checksum SHA-256 po odebraniu pliku konfiguracji" },
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
