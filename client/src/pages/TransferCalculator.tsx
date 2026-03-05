import { Calculator, QrCode, Volume2, Cpu, Info, Wifi, Eye, Radio, BarChart3, Settings2 } from "lucide-react";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ─── Transfer methods ─────────────────────────────────────────────────────────
interface MethodParams { [key: string]: number }
interface MethodResult { throughput: number; latency: number; chunks: number; reliability: number }

interface Method {
  id: string;
  name: string;
  shortName: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  category: "optical" | "acoustic" | "electromagnetic" | "physical";
  description: string;
  security: "high" | "medium" | "low";
  hardware: string;
  params: MethodParams;
  formula: (size: number, p: MethodParams) => MethodResult;
  tips: string[];
}

const methods: Method[] = [
  {
    id: "qr_static",
    name: "QR Code (statyczny)",
    shortName: "QR Static",
    icon: QrCode,
    color: "text-green-400",
    bgColor: "bg-green-400",
    category: "optical",
    description: "Pojedynczy lub sekwencja kodów QR skanowanych ręcznie. Najlepsza metoda dla małych danych.",
    security: "high",
    hardware: "Ekran + kamera/skaner",
    params: { chunkSize: 2953, scanTime: 3, errorRate: 0.01 },
    formula: (size, p) => ({
      throughput: p.chunkSize / (p.scanTime + 1),
      latency: Math.ceil(size / p.chunkSize) * (p.scanTime + 1),
      chunks: Math.ceil(size / p.chunkSize),
      reliability: (1 - p.errorRate) * 100,
    }),
    tips: [
      "Idealny dla małych danych (<3KB) — jeden QR kod",
      "Dla większych danych: numeruj fragmenty (1/N, 2/N...)",
      "Weryfikuj każdy fragment przez SHA-256",
      "Używaj korekcji błędów Level M lub H",
      "Trzymaj ekran nieruchomo podczas skanowania",
    ],
  },
  {
    id: "qr_video",
    name: "QR Video Stream",
    shortName: "QR Video",
    icon: QrCode,
    color: "text-blue-400",
    bgColor: "bg-blue-400",
    category: "optical",
    description: "Sekwencja QR wyświetlana jako wideo (30fps). Efektywna dla danych 10KB-1MB.",
    security: "high",
    hardware: "Monitor + kamera HD",
    params: { chunkSize: 500, fps: 30, errorRate: 0.05 },
    formula: (size, p) => ({
      throughput: p.chunkSize * p.fps,
      latency: Math.ceil(size / (p.chunkSize * p.fps)),
      chunks: Math.ceil(size / p.chunkSize),
      reliability: (1 - p.errorRate) * 100,
    }),
    tips: [
      "Wymaga stabilnej kamery i dobrego oświetlenia",
      "Użyj biblioteki libcamera lub OpenCV do odczytu",
      "Implementuj protokół retransmisji zaginionych klatek",
      "Efektywny dla danych 10KB-1MB",
      "Ustaw stały FPS i synchronizuj przez znacznik czasu",
    ],
  },
  {
    id: "video_steg",
    name: "Video Steganography",
    shortName: "Video Steg",
    icon: Eye,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400",
    category: "optical",
    description: "Ukrywanie danych w LSB klatek wideo. Niewidoczne dla obserwatora, wymaga specjalnego oprogramowania.",
    security: "high",
    hardware: "Kamera + oprogramowanie steg",
    params: { fps: 30, resolution: 1920 * 1080, bitsPerPixel: 1, errorRate: 0.001 },
    formula: (size, p) => {
      const bitsPerFrame = p.resolution * p.bitsPerPixel * 3; // RGB
      const bytesPerFrame = bitsPerFrame / 8;
      const throughput = bytesPerFrame * p.fps;
      return {
        throughput,
        latency: size / throughput,
        chunks: 1,
        reliability: (1 - p.errorRate) * 100,
      };
    },
    tips: [
      "Ukrywa dane w najmniej znaczących bitach pikseli",
      "Niewidoczne gołym okiem — idealne dla ukrytego kanału",
      "Użyj FFmpeg + własnego skryptu LSB",
      "Szyfruj dane przed steganografią (defense in depth)",
      "Pojemność: ~1 bit na kanał RGB na piksel",
    ],
  },
  {
    id: "acoustic",
    name: "Akustyczny (GGWAVE)",
    shortName: "Acoustic",
    icon: Volume2,
    color: "text-purple-400",
    bgColor: "bg-purple-400",
    category: "acoustic",
    description: "Transfer przez dźwięk ultradźwiękowy (18-22kHz). Niesłyszalny dla ludzi.",
    security: "medium",
    hardware: "Głośnik + mikrofon",
    params: { bps: 200, errorRate: 0.1 },
    formula: (size, p) => ({
      throughput: p.bps / 8,
      latency: Math.ceil((size * 8) / p.bps),
      chunks: 1,
      reliability: (1 - p.errorRate) * 100,
    }),
    tips: [
      "Wymaga cichego otoczenia (<40dB)",
      "Odległość max 5m między urządzeniami",
      "Użyj GGWAVE lub własnej implementacji FSK",
      "Szyfruj dane przed transmisją akustyczną",
      "Podatny na zakłócenia — używaj CRC dla weryfikacji",
    ],
  },
  {
    id: "optical_led",
    name: "LED Optical Bridge",
    shortName: "LED Bridge",
    icon: Cpu,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400",
    category: "optical",
    description: "Migające diody LED + fotodioda. Eksperymentalne, wymaga dedykowanego hardware.",
    security: "high",
    hardware: "LED + fotodioda + Arduino",
    params: { bps: 1000, errorRate: 0.02 },
    formula: (size, p) => ({
      throughput: p.bps / 8,
      latency: Math.ceil(size / (p.bps / 8)),
      chunks: 1,
      reliability: (1 - p.errorRate) * 100,
    }),
    tips: [
      "Wymaga dedykowanego hardware (LED + fotodioda)",
      "Odległość max 1m, bezpośrednia linia widzenia",
      "Implementuj Manchester encoding dla synchronizacji",
      "Eksperymentalne — nie dla produkcji",
      "Możliwe przyspieszenie przez IR LED (niewidoczne)",
    ],
  },
  {
    id: "laser",
    name: "Laserowy Tripwire Bridge",
    shortName: "Laser",
    icon: Radio,
    color: "text-red-400",
    bgColor: "bg-red-400",
    category: "optical",
    description: "Modulowany laser + fotodioda. Wysoka przepustowość, wymaga precyzyjnego ustawienia.",
    security: "high",
    hardware: "Laser dioda + fototranzystor",
    params: { bps: 9600, errorRate: 0.005 },
    formula: (size, p) => ({
      throughput: p.bps / 8,
      latency: Math.ceil(size / (p.bps / 8)),
      chunks: 1,
      reliability: (1 - p.errorRate) * 100,
    }),
    tips: [
      "Moduluj laser cyfrowo (OOK lub FSK)",
      "Użyj kolimowanej wiązki dla odległości >5m",
      "Implementuj protokół HDLC lub własny",
      "Uwaga: laser może być widoczny w kamerach IR",
      "Dodaj szyfrowanie warstwy fizycznej",
    ],
  },
  {
    id: "usb_dead_drop",
    name: "USB Dead Drop",
    shortName: "USB Drop",
    icon: Wifi,
    color: "text-orange-400",
    bgColor: "bg-orange-400",
    category: "physical",
    description: "Fizyczny nośnik USB przekazywany przez Dead Drop. Najwyższa przepustowość, wymaga fizycznego dostępu.",
    security: "high",
    hardware: "USB 3.0 + VeraCrypt",
    params: { speedMBps: 100, walkTime: 300, errorRate: 0 },
    formula: (size, p) => ({
      throughput: p.speedMBps * 1024 * 1024,
      latency: size / (p.speedMBps * 1024 * 1024) + p.walkTime,
      chunks: 1,
      reliability: (1 - p.errorRate) * 100,
    }),
    tips: [
      "Szyfruj USB przez VeraCrypt z silnym hasłem",
      "Używaj nowych USB dla każdego transferu (BadUSB risk)",
      "Weryfikuj SHA-256 po odebraniu",
      "Wybierz Dead Drop z kamerami CCTV poza zasięgiem",
      "Ustaw czas odbioru z wyprzedzeniem przez bezpieczny kanał",
    ],
  },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toFixed(0)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatTime(seconds: number): string {
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

const securityBadge = { high: { label: "WYSOKA", color: "text-green-400 bg-green-400/10" }, medium: { label: "ŚREDNIA", color: "text-yellow-400 bg-yellow-400/10" }, low: { label: "NISKA", color: "text-red-400 bg-red-400/10" } };
const categoryLabel = { optical: "Optyczny", acoustic: "Akustyczny", electromagnetic: "Elektromagnetyczny", physical: "Fizyczny" };

const presets = [
  { label: "Klucz GPG (4KB)", size: 4096, unit: "B" as const },
  { label: "Hasło (256B)", size: 256, unit: "B" as const },
  { label: "Certyfikat SSL (2KB)", size: 2048, unit: "B" as const },
  { label: "Konfiguracja (10KB)", size: 10, unit: "KB" as const },
  { label: "Skrypt (50KB)", size: 50, unit: "KB" as const },
  { label: "Dokument (1MB)", size: 1, unit: "MB" as const },
  { label: "Backup (100MB)", size: 100, unit: "MB" as const },
  { label: "Klucz SSH (2KB)", size: 2, unit: "KB" as const },
];

export default function TransferCalculator() {
  const [dataSize, setDataSize] = useState(4096);
  const [unit, setUnit] = useState<"B" | "KB" | "MB">("B");
  const [selectedMethod, setSelectedMethod] = useState("qr_static");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showChart, setShowChart] = useState(false);

  const sizeInBytes = useMemo(() => {
    if (unit === "KB") return dataSize * 1024;
    if (unit === "MB") return dataSize * 1024 * 1024;
    return dataSize;
  }, [dataSize, unit]);

  const results = useMemo(() => methods.map(m => ({ ...m, result: m.formula(sizeInBytes, m.params) })), [sizeInBytes]);

  const filteredResults = useMemo(() =>
    filterCategory === "all" ? results : results.filter(r => r.category === filterCategory),
    [results, filterCategory]);

  const selected = results.find(r => r.id === selectedMethod);

  const chartData = useMemo(() => results.map(r => ({
    name: r.shortName,
    throughput: Math.round(r.result.throughput / 1024),
    latency: Math.round(r.result.latency),
    color: r.bgColor,
  })), [results]);

  // Best method recommendation
  const bestForSpeed = results.reduce((a, b) => a.result.throughput > b.result.throughput ? a : b);
  const bestForSecurity = results.filter(r => r.security === "high").reduce((a, b) => a.result.throughput > b.result.throughput ? a : b);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground tracking-wide">KALKULATOR TRANSFERU</h1>
          <p className="text-sm text-muted-foreground mt-1">Wydajność 7 metod transferu danych przez kanały Air-Gap</p>
        </div>
        <button onClick={() => setShowChart(!showChart)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${showChart ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
          <BarChart3 className="w-3.5 h-3.5" />
          {showChart ? "TABELA" : "WYKRES"}
        </button>
      </div>

      {/* Input */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-mono font-semibold text-foreground">PARAMETRY DANYCH</h2>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-32">
            <label className="text-xs font-mono text-muted-foreground block mb-1">ROZMIAR DANYCH</label>
            <input type="number" value={dataSize} onChange={e => setDataSize(Number(e.target.value))} min={1}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs font-mono text-muted-foreground block mb-1">JEDNOSTKA</label>
            <div className="flex gap-1">
              {(["B", "KB", "MB"] as const).map(u => (
                <button key={u} onClick={() => setUnit(u)}
                  className={`px-3 py-2 rounded-lg text-xs font-mono transition-all ${unit === u ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-mono text-muted-foreground block mb-2">SZYBKIE PRESETY</label>
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <button key={p.label} onClick={() => { setDataSize(p.size); setUnit(p.unit); }}
                className="px-2 py-1 rounded bg-muted text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all">
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-muted-foreground">Rozmiar: <span className="text-primary">{formatBytes(sizeInBytes)}</span></span>
          <span className="text-muted-foreground">= <span className="text-primary">{sizeInBytes.toLocaleString()} B</span></span>
        </div>
      </div>

      {/* Recommendations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-green-400/5 border border-green-400/20 rounded-xl p-4">
          <p className="text-xs font-mono text-green-400 mb-1">NAJSZYBSZA METODA</p>
          <p className="text-sm font-mono text-foreground">{bestForSpeed.name}</p>
          <p className="text-xs text-muted-foreground mt-1">{formatBytes(bestForSpeed.result.throughput)}/s — {formatTime(bestForSpeed.result.latency)}</p>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <p className="text-xs font-mono text-primary mb-1">NAJLEPSZA BEZPIECZEŃSTWO + SZYBKOŚĆ</p>
          <p className="text-sm font-mono text-foreground">{bestForSecurity.name}</p>
          <p className="text-xs text-muted-foreground mt-1">{formatBytes(bestForSecurity.result.throughput)}/s — {formatTime(bestForSecurity.result.latency)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "optical", "acoustic", "physical"].map(cat => (
          <button key={cat} onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${filterCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {cat === "all" ? "WSZYSTKIE" : categoryLabel[cat as keyof typeof categoryLabel]?.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Chart or Table */}
      {showChart ? (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-mono font-semibold text-foreground">PRZEPUSTOWOŚĆ (KB/s)</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "monospace", fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fontFamily: "monospace", fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px", fontFamily: "monospace" }}
                  formatter={(v: number) => [`${v} KB/s`, "Przepustowość"]}
                />
                <Bar dataKey="throughput" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={`hsl(var(--primary))`} opacity={filteredResults.find(r => r.shortName === entry.name) ? 1 : 0.3} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-mono font-semibold text-foreground">PORÓWNANIE METOD</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-normal">METODA</th>
                  <th className="text-left py-2 text-muted-foreground font-normal hidden sm:table-cell">KATEGORIA</th>
                  <th className="text-right py-2 text-muted-foreground font-normal">PRZEPUSTOWOŚĆ</th>
                  <th className="text-right py-2 text-muted-foreground font-normal">CZAS</th>
                  <th className="text-right py-2 text-muted-foreground font-normal hidden md:table-cell">FRAGMENTY</th>
                  <th className="text-right py-2 text-muted-foreground font-normal">NIEZAW.</th>
                  <th className="text-right py-2 text-muted-foreground font-normal hidden lg:table-cell">BEZP.</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map(r => (
                  <tr key={r.id} onClick={() => setSelectedMethod(r.id)}
                    className={`border-b border-border/50 cursor-pointer transition-colors ${selectedMethod === r.id ? "bg-primary/10" : "hover:bg-muted/30"}`}>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <r.icon className={`w-3 h-3 ${r.color}`} />
                        <span className={selectedMethod === r.id ? "text-primary" : "text-foreground"}>{r.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground hidden sm:table-cell">{categoryLabel[r.category]}</td>
                    <td className="text-right py-3 text-foreground">{formatBytes(r.result.throughput)}/s</td>
                    <td className={`text-right py-3 ${r.result.latency < 10 ? "text-green-400" : r.result.latency < 60 ? "text-yellow-400" : "text-red-400"}`}>
                      {formatTime(r.result.latency)}
                    </td>
                    <td className="text-right py-3 text-foreground hidden md:table-cell">{r.result.chunks}</td>
                    <td className={`text-right py-3 ${r.result.reliability >= 99 ? "text-green-400" : r.result.reliability >= 90 ? "text-yellow-400" : "text-red-400"}`}>
                      {r.result.reliability.toFixed(1)}%
                    </td>
                    <td className="text-right py-3 hidden lg:table-cell">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${securityBadge[r.security].color}`}>
                        {securityBadge[r.security].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Method Detail */}
      {selected && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <selected.icon className={`w-5 h-5 ${selected.color}`} />
              <h2 className="text-sm font-mono font-semibold text-foreground">{selected.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{categoryLabel[selected.category]}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${securityBadge[selected.security].color}`}>
                {securityBadge[selected.security].label}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{selected.description}</p>
          <p className="text-xs text-muted-foreground font-mono">Hardware: <span className="text-foreground">{selected.hardware}</span></p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "PRZEPUSTOWOŚĆ", value: `${formatBytes(selected.result.throughput)}/s`, color: selected.color },
              { label: "CZAS TRANSFERU", value: formatTime(selected.result.latency), color: selected.result.latency < 10 ? "text-green-400" : selected.result.latency < 60 ? "text-yellow-400" : "text-red-400" },
              { label: "FRAGMENTY", value: `${selected.result.chunks}`, color: "text-foreground" },
              { label: "NIEZAWODNOŚĆ", value: `${selected.result.reliability.toFixed(1)}%`, color: selected.result.reliability >= 99 ? "text-green-400" : selected.result.reliability >= 90 ? "text-yellow-400" : "text-red-400" },
            ].map(stat => (
              <div key={stat.label} className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground font-mono">{stat.label}</p>
                <p className={`text-lg font-bold font-mono mt-1 ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-muted/20 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Info className="w-3 h-3 text-muted-foreground" />
              <p className="text-xs font-mono text-muted-foreground">WSKAZÓWKI IMPLEMENTACJI</p>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              {selected.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Scenario Guide */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-mono font-semibold text-foreground">PRZEWODNIK SCENARIUSZY</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { scenario: "Klucze kryptograficzne (<10KB)", method: "QR Code statyczny", reason: "Prosty, niezawodny, weryfikowalny" },
            { scenario: "Konfiguracja systemu (10-100KB)", method: "QR Video Stream", reason: "Automatyczny transfer, wysoka niezawodność" },
            { scenario: "Backup danych (>1MB)", method: "USB Dead Drop", reason: "Najwyższa przepustowość, pełna kontrola" },
            { scenario: "Ukryty kanał komunikacji", method: "Video Steganography", reason: "Niewidoczny dla obserwatora" },
            { scenario: "Transfer w hałaśliwym środowisku", method: "LED Optical Bridge", reason: "Odporny na zakłócenia akustyczne" },
            { scenario: "Długodystansowy transfer optyczny", method: "Laserowy Bridge", reason: "Zasięg >10m, wysoka przepustowość" },
          ].map(s => (
            <div key={s.scenario} className="bg-muted/20 rounded-lg p-3">
              <p className="text-xs font-mono text-primary mb-1">{s.scenario}</p>
              <p className="text-xs text-foreground font-semibold">{s.method}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.reason}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
