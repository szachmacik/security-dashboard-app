import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Activity, AlertTriangle, CheckCircle, Copy, Info,
  RefreshCw, Upload, Zap
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

// Shannon entropy calculation
function shannonEntropy(data: string): number {
  if (!data.length) return 0;
  const freq: Record<string, number> = {};
  for (const ch of data) freq[ch] = (freq[ch] ?? 0) + 1;
  const len = data.length;
  return -Object.values(freq).reduce((acc, count) => {
    const p = count / len;
    return acc + p * Math.log2(p);
  }, 0);
}

function byteEntropy(bytes: Uint8Array): number {
  if (!bytes.length) return 0;
  const freq = new Array(256).fill(0);
  Array.from(bytes).forEach(b => { freq[b]++; });
  const len = bytes.length;
  return -freq.reduce((acc, count) => {
    if (count === 0) return acc;
    const p = count / len;
    return acc + p * Math.log2(p);
  }, 0);
}

function charFrequency(data: string): { char: string; count: number; percent: number }[] {
  const freq: Record<string, number> = {};
  for (const ch of data) freq[ch] = (freq[ch] ?? 0) + 1;
  const total = data.length;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([char, count]) => ({
      char: char === " " ? "SPC" : char === "\n" ? "\\n" : char === "\t" ? "\\t" : char,
      count,
      percent: (count / total) * 100,
    }));
}

function entropyLevel(entropy: number, maxEntropy: number): { label: string; color: string; bg: string; description: string } {
  const ratio = entropy / maxEntropy;
  if (ratio >= 0.95) return { label: "LOSOWE/SZYFROWANE", color: "text-red-400", bg: "bg-red-500/20", description: "Dane wyglądają jak zaszyfrowane lub skompresowane. Bardzo wysoka losowość." };
  if (ratio >= 0.85) return { label: "WYSOKA ENTROPIA", color: "text-orange-400", bg: "bg-orange-500/20", description: "Dane mają wysoką losowość. Może to być klucz, hash lub skompresowany plik." };
  if (ratio >= 0.65) return { label: "UMIARKOWANA", color: "text-yellow-400", bg: "bg-yellow-500/20", description: "Typowy tekst lub dane z umiarkowaną redundancją." };
  if (ratio >= 0.40) return { label: "NISKA ENTROPIA", color: "text-blue-400", bg: "bg-blue-500/20", description: "Dane mają dużo powtórzeń. Typowy tekst naturalny lub kod." };
  return { label: "BARDZO NISKA", color: "text-green-400", bg: "bg-green-500/20", description: "Bardzo dużo powtórzeń. Może to być padding, stałe wartości lub prosty wzorzec." };
}

function detectEncoding(text: string): string[] {
  const hints: string[] = [];
  if (/^[0-9a-fA-F]+$/.test(text.trim())) hints.push("HEX");
  if (/^[A-Za-z0-9+/]+=*$/.test(text.trim()) && text.length % 4 === 0) hints.push("Base64");
  if (/^[01\s]+$/.test(text.trim())) hints.push("Binary");
  if (/^[2-7A-Z]+=*$/i.test(text.trim())) hints.push("Base32");
  if (/^\$2[aby]\$/.test(text.trim())) hints.push("bcrypt hash");
  if (/^[0-9a-f]{32}$/i.test(text.trim())) hints.push("MD5 hash");
  if (/^[0-9a-f]{40}$/i.test(text.trim())) hints.push("SHA-1 hash");
  if (/^[0-9a-f]{64}$/i.test(text.trim())) hints.push("SHA-256 hash");
  if (/^[0-9a-f]{128}$/i.test(text.trim())) hints.push("SHA-512 hash");
  if (/-----BEGIN/.test(text)) hints.push("PEM/Certificate");
  if (/^ey[A-Za-z0-9_-]+\./.test(text.trim())) hints.push("JWT Token");
  return hints;
}

function generateRandomKey(bits: number): string {
  const bytes = new Uint8Array(bits / 8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function EntropyAnalyzer() {
  const [inputText, setInputText] = useState("");
  const [fileResult, setFileResult] = useState<{ name: string; entropy: number; size: number; level: ReturnType<typeof entropyLevel> } | null>(null);
  const [generatedKey, setGeneratedKey] = useState<{ bits: number; hex: string; b64: string } | null>(null);

  const textEntropy = inputText ? shannonEntropy(inputText) : 0;
  const maxTextEntropy = Math.log2(new Set(inputText).size || 1);
  const textLevel = entropyLevel(textEntropy, 8); // max 8 bits for bytes
  const freqData = inputText ? charFrequency(inputText) : [];
  const detectedEncodings = inputText ? detectEncoding(inputText) : [];

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Plik za duży (max 10MB)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const buf = ev.target?.result as ArrayBuffer;
      const bytes = new Uint8Array(buf);
      const entropy = byteEntropy(bytes);
      const level = entropyLevel(entropy, 8);
      setFileResult({ name: file.name, entropy, size: file.size, level });
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleGenKey = (bits: number) => {
    const hex = generateRandomKey(bits);
    const raw = hex.match(/.{2}/g)!.map(h => parseInt(h, 16));
    const b64 = btoa(String.fromCharCode(...raw));
    setGeneratedKey({ bits, hex, b64 });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} skopiowany`));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Analizator Entropii
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Analiza losowości danych, wykrywanie szyfrowania i generator kluczy kryptograficznych</p>
        </div>
      </div>

      <Tabs defaultValue="text">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="text" className="font-mono text-xs">Analiza Tekstu</TabsTrigger>
          <TabsTrigger value="file" className="font-mono text-xs">Analiza Pliku</TabsTrigger>
          <TabsTrigger value="keygen" className="font-mono text-xs">Generator Kluczy</TabsTrigger>
          <TabsTrigger value="guide" className="font-mono text-xs">Przewodnik</TabsTrigger>
        </TabsList>

        {/* TEXT ANALYSIS */}
        <TabsContent value="text" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label className="text-muted-foreground text-xs font-mono">Wklej tekst, hash, klucz lub dane do analizy</Label>
              <Textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Wklej tutaj: hasło, klucz API, hash, token JWT, zaszyfrowane dane..."
                className="bg-background border-border font-mono text-sm h-48 resize-none"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setInputText("")} className="border-border text-xs">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Wyczyść
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const sample = "Oto przykładowy tekst w języku polskim z wieloma powtarzającymi się literami i słowami.";
                    setInputText(sample);
                  }}
                  className="border-border text-xs"
                >
                  Przykład: tekst
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const key = generateRandomKey(256);
                    setInputText(key);
                  }}
                  className="border-border text-xs"
                >
                  Przykład: klucz
                </Button>
              </div>
            </div>

            {inputText ? (
              <div className="space-y-3">
                {/* Entropy score */}
                <Card className="bg-card border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-mono">ENTROPIA SHANNONA</span>
                      <Badge className={`text-xs border ${textLevel.bg} ${textLevel.color}`}>
                        {textLevel.label}
                      </Badge>
                    </div>
                    <div className="text-3xl font-bold font-mono" style={{ color: textLevel.color.replace("text-", "") }}>
                      {textEntropy.toFixed(4)} <span className="text-sm text-muted-foreground">bits/symbol</span>
                    </div>
                    <Progress value={(textEntropy / 8) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground">{textLevel.description}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                      <div>
                        <div className="text-muted-foreground">Długość</div>
                        <div className="text-foreground">{inputText.length} znaków</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Unikalne</div>
                        <div className="text-foreground">{new Set(inputText).size} symboli</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Max entropia</div>
                        <div className="text-foreground">{maxTextEntropy.toFixed(2)} bits</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Detected encodings */}
                {detectedEncodings.length > 0 && (
                  <Card className="bg-card border-border border-yellow-500/30">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs font-mono text-yellow-400">WYKRYTE FORMATY</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {detectedEncodings.map(enc => (
                          <Badge key={enc} className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{enc}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                  <Activity className="w-10 h-10 opacity-30" />
                  <p className="font-mono text-sm">Wklej dane aby zobaczyć analizę</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Frequency chart */}
          {freqData.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-mono text-sm text-muted-foreground">Rozkład częstości znaków (top 20)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={freqData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="char" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "JetBrains Mono" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "JetBrains Mono" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontFamily: "JetBrains Mono", fontSize: "11px" }}
                      formatter={(val: number, name: string) => [name === "percent" ? `${val.toFixed(1)}%` : val, name === "percent" ? "Udział" : "Liczba"]}
                    />
                    <Bar dataKey="count" name="count" radius={[2, 2, 0, 0]}>
                      {freqData.map((_, i) => (
                        <Cell key={i} fill={`hsl(${120 + i * 8}, 60%, 50%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* FILE ANALYSIS */}
        <TabsContent value="file" className="space-y-4 mt-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-3">
                <Upload className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
                <p className="text-sm text-muted-foreground font-mono">Wybierz plik do analizy entropii (max 10MB)</p>
                <p className="text-xs text-muted-foreground">Analiza wykonywana lokalnie — plik nie jest wysyłany nigdzie</p>
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                  <span className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-mono hover:opacity-90 transition-opacity">
                    Wybierz plik
                  </span>
                </label>
              </div>

              {fileResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="font-mono text-sm text-foreground">{fileResult.name}</span>
                    <span className="text-xs text-muted-foreground">({(fileResult.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <Card className={`border ${fileResult.level.bg} border-current`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-mono">ENTROPIA BAJTÓW</span>
                        <Badge className={`text-xs border ${fileResult.level.bg} ${fileResult.level.color}`}>
                          {fileResult.level.label}
                        </Badge>
                      </div>
                      <div className={`text-3xl font-bold font-mono ${fileResult.level.color}`}>
                        {fileResult.entropy.toFixed(4)} <span className="text-sm text-muted-foreground">bits/bajt</span>
                      </div>
                      <Progress value={(fileResult.entropy / 8) * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground">{fileResult.level.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-xs font-mono mt-2">
                        <div className="space-y-1">
                          <div className="text-muted-foreground">Interpretacja:</div>
                          {fileResult.entropy > 7.5 && <div className="text-red-400">⚠ Prawdopodobnie zaszyfrowany lub skompresowany</div>}
                          {fileResult.entropy > 6.5 && fileResult.entropy <= 7.5 && <div className="text-orange-400">→ Dane binarne lub częściowo skompresowane</div>}
                          {fileResult.entropy > 4.0 && fileResult.entropy <= 6.5 && <div className="text-yellow-400">→ Typowy plik tekstowy lub kod źródłowy</div>}
                          {fileResult.entropy <= 4.0 && <div className="text-green-400">→ Plik z dużą redundancją (tekst, XML, JSON)</div>}
                        </div>
                        <div className="space-y-1">
                          <div className="text-muted-foreground">Referencje:</div>
                          <div className="text-muted-foreground">7.5-8.0 → AES/ChaCha20</div>
                          <div className="text-muted-foreground">6.0-7.5 → ZIP/gzip</div>
                          <div className="text-muted-foreground">3.5-5.5 → Tekst angielski</div>
                          <div className="text-muted-foreground">2.0-4.0 → Tekst polski</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* KEY GENERATOR */}
        <TabsContent value="keygen" className="space-y-4 mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="font-mono text-sm text-muted-foreground">Generator Kluczy Kryptograficznych</CardTitle>
              <p className="text-xs text-muted-foreground">Klucze generowane lokalnie przez Web Crypto API (crypto.getRandomValues) — kryptograficznie bezpieczne</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[128, 192, 256, 512].map(bits => (
                  <Button
                    key={bits}
                    variant="outline"
                    onClick={() => handleGenKey(bits)}
                    className="border-border font-mono text-sm h-16 flex-col gap-1"
                  >
                    <span className="text-lg font-bold text-primary">{bits}</span>
                    <span className="text-xs text-muted-foreground">bitów</span>
                  </Button>
                ))}
              </div>

              {generatedKey && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-mono text-green-400">Klucz {generatedKey.bits}-bitowy wygenerowany</span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-mono">HEX ({generatedKey.bits / 4} znaków)</Label>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-background border border-border rounded p-2 text-xs font-mono text-green-400 break-all">
                        {generatedKey.hex}
                      </code>
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(generatedKey.hex, "Klucz HEX")} className="border-border shrink-0">
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-mono">Base64</Label>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-background border border-border rounded p-2 text-xs font-mono text-blue-400 break-all">
                        {generatedKey.b64}
                      </code>
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(generatedKey.b64, "Klucz Base64")} className="border-border shrink-0">
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground font-mono p-3 bg-background border border-border rounded space-y-1">
                    <div className="flex items-center gap-1 text-yellow-400 mb-1">
                      <AlertTriangle className="w-3 h-3" />
                      Zasady bezpiecznego przechowywania klucza:
                    </div>
                    <div>→ Nigdy nie przechowuj klucza w tym samym miejscu co zaszyfrowane dane</div>
                    <div>→ Użyj menedżera haseł lub zaszyfrowanego kontenera (VeraCrypt)</div>
                    <div>→ Rozważ podział klucza (Shamir Secret Sharing) dla krytycznych danych</div>
                    <div>→ Klucz {generatedKey.bits}-bitowy: odpowiedni dla {generatedKey.bits >= 256 ? "AES-256, ChaCha20-Poly1305" : generatedKey.bits >= 192 ? "AES-192" : "AES-128"}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GUIDE */}
        <TabsContent value="guide" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Co to jest entropia?",
                icon: Info,
                color: "text-blue-400",
                content: "Entropia Shannona mierzy średnią ilość informacji (niepewność) na symbol w danych. Wyrażana w bitach/symbol. Maksymalna entropia = log₂(liczba unikalnych symboli). Dla bajtów: max = 8 bits/bajt (wszystkie 256 wartości równie prawdopodobne)."
              },
              {
                title: "Jak wykryć szyfrowanie?",
                icon: AlertTriangle,
                color: "text-orange-400",
                content: "Zaszyfrowane dane mają entropię bliską 8 bits/bajt (dla AES, ChaCha20). Skompresowane pliki (ZIP, gzip) też mają wysoką entropię (7.0-7.9). Niezaszyfrowany tekst: 3.5-5.5. Jeśli plik ma entropię > 7.5 i nie jest archiwum — prawdopodobnie jest zaszyfrowany."
              },
              {
                title: "Entropia haseł",
                icon: Zap,
                color: "text-yellow-400",
                content: "Hasło z małych liter: max 4.7 bits/znak. Z dużych+małych: 5.7 bits/znak. Alfanumeryczne: 5.95 bits/znak. Z symbolami: 6.55 bits/znak. Hasło 20 znaków alfanumerycznych = ~119 bitów entropii = bardzo bezpieczne. Hasło 8 znaków = ~48 bitów = słabe."
              },
              {
                title: "Zastosowania w OPSEC",
                icon: CheckCircle,
                color: "text-green-400",
                content: "1. Weryfikacja czy plik jest faktycznie zaszyfrowany przed wysłaniem. 2. Sprawdzenie jakości generatora losowego. 3. Analiza czy dane nie zawierają ukrytych wzorców. 4. Ocena siły kluczy kryptograficznych. 5. Wykrywanie steganografii (anomalie w entropii)."
              },
            ].map(item => (
              <Card key={item.title} className="bg-card border-border">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                    <h3 className={`font-mono text-sm font-semibold ${item.color}`}>{item.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.content}</p>
                </CardContent>
              </Card>
            ))}

            {/* Reference table */}
            <Card className="bg-card border-border md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="font-mono text-sm text-muted-foreground">Tabela referencyjna entropii</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 text-muted-foreground">Typ danych</th>
                        <th className="text-left py-2 pr-4 text-muted-foreground">Entropia (bits/bajt)</th>
                        <th className="text-left py-2 text-muted-foreground">Interpretacja</th>
                      </tr>
                    </thead>
                    <tbody className="space-y-1">
                      {[
                        ["AES-256 ciphertext", "7.95 - 8.00", "Losowe, zaszyfrowane"],
                        ["ChaCha20 ciphertext", "7.90 - 8.00", "Losowe, zaszyfrowane"],
                        ["ZIP/gzip archive", "7.00 - 7.90", "Skompresowane"],
                        ["PNG/JPEG image", "6.00 - 7.50", "Dane binarne"],
                        ["Executable (EXE/ELF)", "5.50 - 7.00", "Kod maszynowy"],
                        ["English text", "3.50 - 5.50", "Naturalny język"],
                        ["Polish text", "3.00 - 4.50", "Naturalny język"],
                        ["XML/HTML", "2.50 - 4.50", "Dużo tagów/powtórzeń"],
                        ["JSON data", "3.00 - 5.00", "Strukturalne"],
                        ["Padding/zeros", "0.00 - 1.00", "Brak informacji"],
                      ].map(([type, entropy, desc]) => (
                        <tr key={type} className="border-b border-border/30">
                          <td className="py-1.5 pr-4 text-foreground">{type}</td>
                          <td className="py-1.5 pr-4 text-primary">{entropy}</td>
                          <td className="py-1.5 text-muted-foreground">{desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
