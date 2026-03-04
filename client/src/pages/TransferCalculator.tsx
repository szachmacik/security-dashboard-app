import { Calculator, QrCode, Volume2, Cpu, Info } from "lucide-react";
import { useState, useMemo } from "react";

const methods = [
  {
    id: "qr_static",
    name: "QR Code (statyczny)",
    icon: QrCode,
    color: "text-green-400",
    description: "Pojedynczy kod QR skanowany ręcznie",
    params: { chunkSize: 2953, scanTime: 3, errorRate: 0.01 },
    formula: (size: number, p: any) => ({
      throughput: p.chunkSize / (p.scanTime + 1),
      latency: Math.ceil(size / p.chunkSize) * (p.scanTime + 1),
      chunks: Math.ceil(size / p.chunkSize),
      reliability: (1 - p.errorRate) * 100,
    }),
  },
  {
    id: "qr_video",
    name: "QR Video Stream",
    icon: QrCode,
    color: "text-blue-400",
    description: "Sekwencja QR wyświetlana jako wideo (30fps)",
    params: { chunkSize: 500, fps: 30, errorRate: 0.05 },
    formula: (size: number, p: any) => ({
      throughput: p.chunkSize * p.fps,
      latency: Math.ceil(size / (p.chunkSize * p.fps)),
      chunks: Math.ceil(size / p.chunkSize),
      reliability: (1 - p.errorRate) * 100,
    }),
  },
  {
    id: "acoustic",
    name: "Akustyczny (GGWAVE)",
    icon: Volume2,
    color: "text-purple-400",
    description: "Transfer przez dźwięk ultradźwiękowy",
    params: { bps: 200, errorRate: 0.1 },
    formula: (size: number, p: any) => ({
      throughput: p.bps,
      latency: Math.ceil((size * 8) / p.bps),
      chunks: 1,
      reliability: (1 - p.errorRate) * 100,
    }),
  },
  {
    id: "optical_led",
    name: "LED Optical Bridge",
    icon: Cpu,
    color: "text-yellow-400",
    description: "Migające diody LED + fotodioda (eksperymentalne)",
    params: { bps: 1000, errorRate: 0.02 },
    formula: (size: number, p: any) => ({
      throughput: p.bps / 8,
      latency: Math.ceil(size / (p.bps / 8)),
      chunks: 1,
      reliability: (1 - p.errorRate) * 100,
    }),
  },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export default function TransferCalculator() {
  const [dataSize, setDataSize] = useState(1024);
  const [unit, setUnit] = useState<"B" | "KB" | "MB">("B");
  const [selectedMethod, setSelectedMethod] = useState("qr_static");

  const sizeInBytes = useMemo(() => {
    if (unit === "KB") return dataSize * 1024;
    if (unit === "MB") return dataSize * 1024 * 1024;
    return dataSize;
  }, [dataSize, unit]);

  const results = useMemo(() => {
    return methods.map(m => ({
      ...m,
      result: m.formula(sizeInBytes, m.params),
    }));
  }, [sizeInBytes]);

  const selected = results.find(r => r.id === selectedMethod);

  const presets = [
    { label: "Klucz GPG (4KB)", size: 4096, unit: "B" as const },
    { label: "Hasło (256B)", size: 256, unit: "B" as const },
    { label: "Certyfikat SSL (2KB)", size: 2048, unit: "B" as const },
    { label: "Konfiguracja (10KB)", size: 10, unit: "KB" as const },
    { label: "Skrypt (50KB)", size: 50, unit: "KB" as const },
    { label: "Dokument (1MB)", size: 1, unit: "MB" as const },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold font-mono text-foreground tracking-wide">KALKULATOR TRANSFERU</h1>
        <p className="text-sm text-muted-foreground mt-1">Wydajność transferu optycznego, akustycznego i elektromagnetycznego</p>
      </div>

      {/* Input */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-mono font-semibold text-foreground">PARAMETRY DANYCH</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
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

        {/* Presets */}
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

        <div className="text-xs text-muted-foreground font-mono">
          Rozmiar: <span className="text-primary">{formatBytes(sizeInBytes)}</span> = <span className="text-primary">{sizeInBytes} bajtów</span>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-mono font-semibold text-foreground">PORÓWNANIE METOD</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-normal">METODA</th>
                <th className="text-right py-2 text-muted-foreground font-normal">PRZEPUSTOWOŚĆ</th>
                <th className="text-right py-2 text-muted-foreground font-normal">CZAS</th>
                <th className="text-right py-2 text-muted-foreground font-normal">FRAGMENTY</th>
                <th className="text-right py-2 text-muted-foreground font-normal">NIEZAWODNOŚĆ</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.id} onClick={() => setSelectedMethod(r.id)}
                  className={`border-b border-border/50 cursor-pointer transition-colors ${selectedMethod === r.id ? "bg-primary/10" : "hover:bg-muted/30"}`}>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <r.icon className={`w-3 h-3 ${r.color}`} />
                      <span className={selectedMethod === r.id ? "text-primary" : "text-foreground"}>{r.name}</span>
                    </div>
                  </td>
                  <td className="text-right py-3 text-foreground">{formatBytes(r.result.throughput)}/s</td>
                  <td className={`text-right py-3 ${r.result.latency < 10 ? "text-green-400" : r.result.latency < 60 ? "text-yellow-400" : "text-red-400"}`}>
                    {formatTime(r.result.latency)}
                  </td>
                  <td className="text-right py-3 text-foreground">{r.result.chunks}</td>
                  <td className={`text-right py-3 ${r.result.reliability >= 99 ? "text-green-400" : r.result.reliability >= 90 ? "text-yellow-400" : "text-red-400"}`}>
                    {r.result.reliability.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Method Detail */}
      {selected && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <selected.icon className={`w-5 h-5 ${selected.color}`} />
            <h2 className="text-sm font-mono font-semibold text-foreground">{selected.name}</h2>
          </div>
          <p className="text-xs text-muted-foreground">{selected.description}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "PRZEPUSTOWOŚĆ", value: `${formatBytes(selected.result.throughput)}/s` },
              { label: "CZAS TRANSFERU", value: formatTime(selected.result.latency) },
              { label: "FRAGMENTY QR", value: `${selected.result.chunks}` },
              { label: "NIEZAWODNOŚĆ", value: `${selected.result.reliability.toFixed(1)}%` },
            ].map(stat => (
              <div key={stat.label} className="bg-muted/30 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground font-mono">{stat.label}</p>
                <p className={`text-lg font-bold font-mono mt-1 ${selected.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-muted/20 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Info className="w-3 h-3 text-muted-foreground" />
              <p className="text-xs font-mono text-muted-foreground">REKOMENDACJE</p>
            </div>
            {selected.id === "qr_static" && (
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Idealny dla małych danych (&lt;3KB) — jeden QR kod</li>
                <li>• Dla większych danych: numeruj fragmenty (1/N, 2/N...)</li>
                <li>• Weryfikuj każdy fragment przez SHA-256</li>
                <li>• Używaj korekcji błędów Level M lub H</li>
              </ul>
            )}
            {selected.id === "qr_video" && (
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Wymaga stabilnej kamery i dobrego oświetlenia</li>
                <li>• Użyj biblioteki libcamera lub OpenCV do odczytu</li>
                <li>• Implementuj protokół retransmisji zaginionych klatek</li>
                <li>• Efektywny dla danych 10KB-1MB</li>
              </ul>
            )}
            {selected.id === "acoustic" && (
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Wymaga cichego otoczenia (&lt;40dB)</li>
                <li>• Odległość max 5m między urządzeniami</li>
                <li>• Użyj GGWAVE lub własnej implementacji FSK</li>
                <li>• Szyfruj dane przed transmisją akustyczną</li>
              </ul>
            )}
            {selected.id === "optical_led" && (
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Wymaga dedykowanego hardware (LED + fotodioda)</li>
                <li>• Odległość max 1m, bezpośrednia linia widzenia</li>
                <li>• Implementuj Manchester encoding dla synchronizacji</li>
                <li>• Eksperymentalne — nie dla produkcji</li>
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
