import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  QrCode, Download, Copy, RefreshCw, CheckCircle, AlertCircle,
  Clock, ArrowUpRight, ArrowDownLeft, Shield, Hash, ChevronLeft,
  ChevronRight, Trash2, Eye, EyeOff
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

const CHUNK_SIZE = 500;

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function generateQRDataURL(text: string, dark = "#00ff88", light = "#0a0f1a"): Promise<string> {
  const QRCode = await import("qrcode");
  return QRCode.toDataURL(text, {
    width: 280, margin: 2,
    color: { dark, light },
    errorCorrectionLevel: "M",
  });
}

function SecurityTips() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-2">
      <h3 className="text-xs font-mono text-muted-foreground tracking-wider flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 text-primary" />PROTOKÓŁ BEZPIECZEŃSTWA
      </h3>
      {[
        "Dane nigdy nie opuszczają urządzenia przez sieć",
        "Transfer wyłącznie przez kanał optyczny (kamera)",
        "Weryfikuj integralność przez SHA-256 po odbiorze",
        "Nie rób zrzutów ekranu QR na urządzeniach online",
        "Dla wrażliwych danych: szyfruj przed kodowaniem QR",
        "Usuń QR z historii po potwierdzeniu odbioru",
      ].map((tip, i) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          <CheckCircle className="w-3 h-3 text-primary mt-0.5 shrink-0" />
          <span className="text-muted-foreground">{tip}</span>
        </div>
      ))}
    </div>
  );
}

export default function QRTransfer() {
  const utils = trpc.useUtils();
  const { data: sessions = [] } = trpc.transfer.list.useQuery();
  const createSession = trpc.transfer.create.useMutation({
    onSuccess: () => utils.transfer.list.invalidate(),
  });
  const updateStatus = trpc.transfer.updateStatus.useMutation({
    onSuccess: () => utils.transfer.list.invalidate(),
  });

  const [mode, setMode] = useState<"generate" | "scan">("generate");
  const [inputText, setInputText] = useState("");
  const [qrChunks, setQrChunks] = useState<string[]>([]);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [sourceDevice, setSourceDevice] = useState("");
  const [targetDevice, setTargetDevice] = useState("");
  const [scannedResult, setScannedResult] = useState("");
  const [hash, setHash] = useState("");
  const [showHash, setShowHash] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [maskInput, setMaskInput] = useState(false);

  const totalChunks = inputText ? Math.ceil(inputText.length / CHUNK_SIZE) : 0;

  // Auto-advance timer for multi-chunk QR
  useEffect(() => {
    if (!autoAdvance || qrChunks.length <= 1) return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    } else {
      if (currentChunk < qrChunks.length - 1) {
        setCurrentChunk(c => c + 1);
        setCountdown(5);
      } else {
        setAutoAdvance(false);
        toast.success("Wszystkie chunki wyświetlone!");
      }
    }
  }, [autoAdvance, countdown, currentChunk, qrChunks.length]);

  const generateQR = useCallback(async () => {
    if (!inputText.trim()) return;
    setGenerating(true);
    try {
      const dataHash = await sha256(inputText);
      setHash(dataHash);

      const chunks: string[] = [];
      if (inputText.length <= CHUNK_SIZE) {
        chunks.push(await generateQRDataURL(inputText));
      } else {
        for (let i = 0; i < totalChunks; i++) {
          const chunk = inputText.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          const payload = JSON.stringify({ idx: i + 1, total: totalChunks, data: chunk, hash: dataHash.slice(0, 8) });
          chunks.push(await generateQRDataURL(payload));
        }
      }

      setQrChunks(chunks);
      setCurrentChunk(0);

      await createSession.mutateAsync({
        direction: "outbound",
        dataType: "text",
        dataSize: inputText.length,
        sourceDevice,
        targetDevice,
        notes: `SHA-256: ${dataHash.slice(0, 16)}... | Chunki: ${totalChunks}`,
      });
      toast.success(`QR wygenerowany — ${totalChunks} kod${totalChunks > 1 ? "ów" : ""}`);
    } catch (e) {
      toast.error("Błąd generowania QR");
    }
    setGenerating(false);
  }, [inputText, totalChunks, sourceDevice, targetDevice]);

  const downloadQR = () => {
    if (!qrChunks[currentChunk]) return;
    const a = document.createElement("a");
    a.href = qrChunks[currentChunk];
    a.download = `qr-transfer-${currentChunk + 1}of${qrChunks.length}-${Date.now()}.png`;
    a.click();
  };

  const downloadAllQR = async () => {
    for (let i = 0; i < qrChunks.length; i++) {
      const a = document.createElement("a");
      a.href = qrChunks[i];
      a.download = `qr-transfer-${i + 1}of${qrChunks.length}.png`;
      a.click();
      await new Promise(r => setTimeout(r, 300));
    }
    toast.success(`Pobrano ${qrChunks.length} plików QR`);
  };

  const verifyHash = async () => {
    if (!scannedResult) return;
    const h = await sha256(scannedResult);
    setHash(h);
    toast.info(`SHA-256: ${h.slice(0, 32)}...`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground tracking-wide">QR TRANSFER</h1>
          <p className="text-sm text-muted-foreground mt-1">Optyczny most danych — bezpieczny transfer przez kody QR</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-card border border-border rounded-lg px-3 py-2">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span>AIR-GAP PROTOCOL</span>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button onClick={() => setMode("generate")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono transition-all ${mode === "generate" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
          <ArrowUpRight className="w-4 h-4" />GENERUJ QR
        </button>
        <button onClick={() => setMode("scan")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono transition-all ${mode === "scan" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
          <ArrowDownLeft className="w-4 h-4" />ODBIERZ DANE
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel */}
        <div className="space-y-4">
          {mode === "generate" ? (
            <>
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-mono font-semibold text-foreground">DANE DO TRANSFERU</h2>
                  <button onClick={() => setMaskInput(!maskInput)} className="text-muted-foreground hover:text-foreground transition-colors">
                    {maskInput ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">TREŚĆ / DANE</Label>
                  <Textarea
                    value={maskInput ? "•".repeat(inputText.length) : inputText}
                    onChange={e => !maskInput && setInputText(e.target.value)}
                    readOnly={maskInput}
                    placeholder="Wpisz dane do zakodowania w QR...&#10;&#10;Może to być: klucz API, hasło, adres, konfiguracja, dowolny tekst"
                    className="mt-1 bg-input font-mono text-sm resize-none"
                    rows={7}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{inputText.length} znaków</span>
                    {inputText.length > 0 && (
                      <span className={`text-xs font-mono ${totalChunks > 1 ? "text-yellow-400" : "text-green-400"}`}>
                        {totalChunks} QR kod{totalChunks !== 1 ? "ów" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-mono text-muted-foreground">ŹRÓDŁO</Label>
                    <Input value={sourceDevice} onChange={e => setSourceDevice(e.target.value)} placeholder="Urządzenie źródłowe" className="mt-1 bg-input font-mono text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs font-mono text-muted-foreground">CEL</Label>
                    <Input value={targetDevice} onChange={e => setTargetDevice(e.target.value)} placeholder="Urządzenie docelowe" className="mt-1 bg-input font-mono text-xs" />
                  </div>
                </div>
                {inputText.length > CHUNK_SIZE && (
                  <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3">
                    <p className="text-xs text-yellow-400 font-mono">⚠ Dane przekraczają {CHUNK_SIZE} znaków. Wymagane {totalChunks} kodów QR w sekwencji.</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={generateQR} disabled={!inputText || generating} className="flex-1 font-mono gap-2">
                    <QrCode className="w-4 h-4" />{generating ? "GENEROWANIE..." : "GENERUJ QR"}
                  </Button>
                  <Button variant="outline" onClick={() => { navigator.clipboard.writeText(inputText); toast.success("Skopiowano"); }} disabled={!inputText} className="gap-2 font-mono text-xs">
                    <Copy className="w-3 h-3" />Kopiuj
                  </Button>
                </div>
                {hash && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                        <Hash className="w-3 h-3" />SHA-256 HASH
                      </span>
                      <button onClick={() => setShowHash(!showHash)} className="text-xs text-muted-foreground hover:text-foreground">
                        {showHash ? "Ukryj" : "Pokaż"}
                      </button>
                    </div>
                    {showHash && <p className="text-xs font-mono text-primary break-all">{hash}</p>}
                    {!showHash && <p className="text-xs font-mono text-primary">{hash.slice(0, 16)}...{hash.slice(-8)}</p>}
                    <Button size="sm" variant="ghost" className="mt-1 h-6 text-xs font-mono" onClick={() => { navigator.clipboard.writeText(hash); toast.success("Hash skopiowany"); }}>
                      <Copy className="w-3 h-3 mr-1" />Kopiuj hash
                    </Button>
                  </div>
                )}
              </div>
              <SecurityTips />
            </>
          ) : (
            <>
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-mono font-semibold text-foreground">ODBIÓR DANYCH</h2>
                <div className="bg-muted/30 border border-dashed border-border rounded-lg p-6 text-center space-y-2">
                  <QrCode className="w-10 h-10 mx-auto text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground font-mono">SKANER KAMERY</p>
                  <p className="text-xs text-muted-foreground">Użyj zewnętrznej aplikacji do skanowania QR i wklej wynik poniżej</p>
                </div>
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">WKLEJONE DANE Z QR</Label>
                  <Textarea
                    value={scannedResult}
                    onChange={e => setScannedResult(e.target.value)}
                    placeholder="Wklej tutaj dane odczytane z kodu QR..."
                    className="mt-1 bg-input font-mono text-sm resize-none"
                    rows={6}
                  />
                  <span className="text-xs text-muted-foreground">{scannedResult.length} znaków</span>
                </div>
                {scannedResult && (
                  <div className="space-y-2">
                    <Button onClick={verifyHash} variant="outline" className="w-full font-mono gap-2 text-xs">
                      <Hash className="w-3.5 h-3.5" />OBLICZ SHA-256 HASH
                    </Button>
                    <Button onClick={() => { navigator.clipboard.writeText(scannedResult); toast.success("Skopiowano"); }} className="w-full font-mono gap-2" variant="outline">
                      <Copy className="w-4 h-4" />KOPIUJ ODEBRANE DANE
                    </Button>
                    <Button onClick={async () => {
                      await createSession.mutateAsync({ direction: "inbound", dataType: "text", dataSize: scannedResult.length, notes: "Odebrane przez QR scan" });
                      toast.success("Sesja odbioru zapisana");
                    }} className="w-full font-mono gap-2">
                      <CheckCircle className="w-4 h-4" />ZAPISZ SESJĘ ODBIORU
                    </Button>
                  </div>
                )}
                {hash && scannedResult && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs font-mono text-muted-foreground mb-1 flex items-center gap-1">
                      <Hash className="w-3 h-3" />SHA-256 ODEBRANYCH DANYCH
                    </p>
                    <p className="text-xs font-mono text-primary break-all">{hash}</p>
                  </div>
                )}
              </div>
              <SecurityTips />
            </>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {mode === "generate" && qrChunks.length > 0 ? (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono font-semibold text-foreground">WYGENEROWANY KOD QR</h2>
                {qrChunks.length > 1 && (
                  <span className="text-xs font-mono text-muted-foreground">
                    {currentChunk + 1} / {qrChunks.length}
                  </span>
                )}
              </div>

              <div className="flex justify-center">
                <div className="p-4 bg-[#0a0f1a] rounded-xl border border-primary/30 relative">
                  <img src={qrChunks[currentChunk]} alt="QR Code" className="w-64 h-64" />
                  {qrChunks.length > 1 && (
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                      {qrChunks.map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentChunk ? "bg-primary" : "bg-muted"}`} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Chunk Navigation */}
              {qrChunks.length > 1 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setCurrentChunk(c => Math.max(0, c - 1)); setCountdown(5); }} disabled={currentChunk === 0} className="font-mono gap-1 text-xs">
                      <ChevronLeft className="w-3.5 h-3.5" />Poprzedni
                    </Button>
                    <div className="text-center">
                      <p className="text-xs font-mono text-muted-foreground">CHUNK {currentChunk + 1}/{qrChunks.length}</p>
                      {autoAdvance && <p className="text-xs text-primary font-mono">Auto: {countdown}s</p>}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setCurrentChunk(c => Math.min(qrChunks.length - 1, c + 1)); setCountdown(5); }} disabled={currentChunk === qrChunks.length - 1} className="font-mono gap-1 text-xs">
                      Następny<ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <Button
                    variant={autoAdvance ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setAutoAdvance(!autoAdvance); setCountdown(5); }}
                    className="w-full font-mono text-xs gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${autoAdvance ? "animate-spin" : ""}`} />
                    {autoAdvance ? "ZATRZYMAJ AUTO-ADVANCE" : "URUCHOM AUTO-ADVANCE (5s)"}
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={downloadQR} className="flex-1 font-mono gap-2" variant="outline">
                  <Download className="w-4 h-4" />Pobierz QR
                </Button>
                {qrChunks.length > 1 && (
                  <Button onClick={downloadAllQR} variant="outline" className="font-mono gap-2 text-xs">
                    <Download className="w-3.5 h-3.5" />Wszystkie
                  </Button>
                )}
                <Button onClick={generateQR} disabled={generating} variant="outline" className="font-mono gap-2">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs font-mono text-muted-foreground mb-2">INSTRUKCJA TRANSFERU:</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Wyświetl QR na ekranie urządzenia źródłowego</li>
                  <li>Użyj kamery urządzenia docelowego do skanowania</li>
                  {qrChunks.length > 1 && <li>Skanuj wszystkie {qrChunks.length} kody w kolejności</li>}
                  <li>Zweryfikuj SHA-256 hash po odbiorze</li>
                  <li>Nie rób zrzutów ekranu QR na urządzeniach online</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-mono font-semibold text-foreground">HISTORIA TRANSFERÓW</h2>
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Brak historii transferów</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {sessions.slice(0, 20).map(s => (
                    <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        {s.direction === "outbound"
                          ? <ArrowUpRight className="w-3.5 h-3.5 text-primary shrink-0" />
                          : <ArrowDownLeft className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        }
                        <div>
                          <p className="text-xs font-mono text-foreground">
                            {s.direction === "outbound" ? "WYSŁANO" : "ODEBRANO"}
                            {s.sourceDevice && ` · ${s.sourceDevice}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {s.dataSize ? `${s.dataSize} znaków` : "—"} · {new Date(s.createdAt).toLocaleDateString("pl-PL")}
                          </p>
                          {s.notes && <p className="text-xs text-muted-foreground truncate max-w-48">{s.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${
                          s.status === "completed" ? "text-green-400 border-green-400/30" :
                          s.status === "failed" ? "text-red-400 border-red-400/30" :
                          "text-yellow-400 border-yellow-400/30"
                        }`}>{s.status.toUpperCase()}</span>
                        {s.status === "pending" && (
                          <button onClick={() => updateStatus.mutate({ id: s.id, status: "completed" })}
                            className="text-muted-foreground hover:text-green-400 transition-colors">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          {sessions.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-xs font-mono text-muted-foreground mb-3">STATYSTYKI TRANSFERÓW</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xl font-mono font-bold text-primary">{sessions.length}</p>
                  <p className="text-xs text-muted-foreground">Łącznie</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-mono font-bold text-green-400">{sessions.filter(s => s.direction === "outbound").length}</p>
                  <p className="text-xs text-muted-foreground">Wysłanych</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-mono font-bold text-blue-400">{sessions.filter(s => s.direction === "inbound").length}</p>
                  <p className="text-xs text-muted-foreground">Odebranych</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
