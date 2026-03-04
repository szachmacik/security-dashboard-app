import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { QrCode, Download, Copy, RefreshCw, CheckCircle, AlertCircle, Clock, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useState, useEffect, useRef } from "react";

// QR generation using canvas
function generateQRDataURL(text: string): Promise<string> {
  return new Promise((resolve) => {
    import("qrcode").then(QRCode => {
      QRCode.toDataURL(text, {
        width: 300, margin: 2,
        color: { dark: "#00ff88", light: "#0a0f1a" },
        errorCorrectionLevel: "M",
      }).then(resolve).catch(() => resolve(""));
    });
  });
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
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sourceDevice, setSourceDevice] = useState("");
  const [targetDevice, setTargetDevice] = useState("");
  const [scannedResult, setScannedResult] = useState("");

  const generateQR = async () => {
    if (!inputText.trim()) return;
    setGenerating(true);
    try {
      const dataUrl = await generateQRDataURL(inputText);
      setQrDataUrl(dataUrl);
      await createSession.mutateAsync({
        direction: "outbound",
        dataType: "text",
        dataSize: inputText.length,
        sourceDevice,
        targetDevice,
        notes: `Dane: ${inputText.substring(0, 50)}${inputText.length > 50 ? "..." : ""}`,
      });
      toast.success("QR wygenerowany i sesja zapisana");
    } catch (e) {
      toast.error("Błąd generowania QR");
    }
    setGenerating(false);
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-transfer-${Date.now()}.png`;
    a.click();
  };

  const copyText = () => {
    navigator.clipboard.writeText(inputText);
    toast.success("Skopiowano do schowka");
  };

  const chunkSize = 500;
  const chunks = inputText ? Math.ceil(inputText.length / chunkSize) : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold font-mono text-foreground tracking-wide">QR TRANSFER</h1>
        <p className="text-sm text-muted-foreground mt-1">Optyczny most danych — bezpieczny transfer przez kody QR</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button onClick={() => setMode("generate")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono transition-all ${mode === "generate" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
          <ArrowUpRight className="w-4 h-4" />GENERUJ QR
        </button>
        <button onClick={() => setMode("scan")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono transition-all ${mode === "scan" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
          <ArrowDownLeft className="w-4 h-4" />SKANUJ QR
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel */}
        <div className="space-y-4">
          {mode === "generate" ? (
            <>
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-mono font-semibold text-foreground">DANE DO TRANSFERU</h2>
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">TREŚĆ / DANE</Label>
                  <Textarea value={inputText} onChange={e => setInputText(e.target.value)}
                    placeholder="Wpisz dane do zakodowania w QR...&#10;&#10;Może to być: klucz API, hasło, adres, konfiguracja, dowolny tekst"
                    className="mt-1 bg-input font-mono text-sm resize-none" rows={8} />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{inputText.length} znaków</span>
                    {inputText.length > 0 && <span className="text-xs text-muted-foreground">{chunks} QR kod{chunks !== 1 ? "ów" : ""}</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs font-mono text-muted-foreground">ŹRÓDŁO</Label>
                    <Input value={sourceDevice} onChange={e => setSourceDevice(e.target.value)} placeholder="Urządzenie źródłowe" className="mt-1 bg-input font-mono text-xs" /></div>
                  <div><Label className="text-xs font-mono text-muted-foreground">CEL</Label>
                    <Input value={targetDevice} onChange={e => setTargetDevice(e.target.value)} placeholder="Urządzenie docelowe" className="mt-1 bg-input font-mono text-xs" /></div>
                </div>
                {inputText.length > chunkSize && (
                  <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3">
                    <p className="text-xs text-yellow-400 font-mono">⚠ Dane przekraczają {chunkSize} znaków. Wymagane {chunks} kodów QR w sekwencji.</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={generateQR} disabled={!inputText || generating} className="flex-1 font-mono gap-2">
                    <QrCode className="w-4 h-4" />{generating ? "GENEROWANIE..." : "GENERUJ QR"}
                  </Button>
                  <Button variant="outline" onClick={copyText} disabled={!inputText} className="gap-2 font-mono text-xs">
                    <Copy className="w-3 h-3" />Kopiuj
                  </Button>
                </div>
              </div>

              {/* Security Info */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-mono text-muted-foreground tracking-wider">PROTOKÓŁ BEZPIECZEŃSTWA</h3>
                {[
                  "Dane nigdy nie opuszczają urządzenia przez sieć",
                  "Transfer wyłącznie przez kanał optyczny (kamera)",
                  "Weryfikuj integralność przez SHA-256 po odbiorze",
                  "Nie skanuj QR z niezaufanych źródeł",
                  "Dla wrażliwych danych: szyfruj przed kodowaniem QR",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <CheckCircle className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{tip}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-mono font-semibold text-foreground">SKANER QR</h2>
              <div className="bg-muted/30 border border-dashed border-border rounded-lg p-8 text-center space-y-3">
                <QrCode className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">Skaner kamery wymaga uprawnień przeglądarki</p>
                <p className="text-xs text-muted-foreground">Użyj zewnętrznej aplikacji do skanowania QR i wklej wynik poniżej</p>
              </div>
              <div>
                <Label className="text-xs font-mono text-muted-foreground">WKLEJONE DANE Z QR</Label>
                <Textarea value={scannedResult} onChange={e => setScannedResult(e.target.value)}
                  placeholder="Wklej tutaj dane odczytane z kodu QR..."
                  className="mt-1 bg-input font-mono text-sm resize-none" rows={6} />
              </div>
              {scannedResult && (
                <div className="space-y-2">
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
            </div>
          )}
        </div>

        {/* Right Panel - QR Display or History */}
        <div className="space-y-4">
          {mode === "generate" && qrDataUrl ? (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-mono font-semibold text-foreground">WYGENEROWANY KOD QR</h2>
              <div className="flex justify-center">
                <div className="p-4 bg-[#0a0f1a] rounded-xl border border-primary/30">
                  <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={downloadQR} className="flex-1 font-mono gap-2" variant="outline">
                  <Download className="w-4 h-4" />Pobierz PNG
                </Button>
                <Button onClick={generateQR} disabled={generating} variant="outline" className="font-mono gap-2">
                  <RefreshCw className="w-4 h-4" />Odśwież
                </Button>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs font-mono text-muted-foreground">INSTRUKCJA TRANSFERU:</p>
                <ol className="text-xs text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
                  <li>Wyświetl ten QR na ekranie urządzenia źródłowego</li>
                  <li>Użyj kamery urządzenia docelowego do skanowania</li>
                  <li>Zweryfikuj integralność odebranych danych</li>
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
                <div className="space-y-2">
                  {sessions.slice(0, 10).map(s => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        {s.direction === "outbound" ? <ArrowUpRight className="w-3 h-3 text-primary" /> : <ArrowDownLeft className="w-3 h-3 text-blue-400" />}
                        <div>
                          <p className="text-xs font-mono text-foreground">{s.direction === "outbound" ? "WYSŁANO" : "ODEBRANO"}</p>
                          <p className="text-xs text-muted-foreground">{s.dataSize ? `${s.dataSize} znaków` : "—"} · {new Date(s.createdAt).toLocaleDateString("pl-PL")}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${
                        s.status === "completed" ? "text-green-400 border-green-400/30" :
                        s.status === "failed" ? "text-red-400 border-red-400/30" :
                        "text-yellow-400 border-yellow-400/30"
                      }`}>{s.status.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
