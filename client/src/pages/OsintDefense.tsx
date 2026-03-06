import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Eye, EyeOff, AlertTriangle, CheckCircle, Copy, Search,
  Globe, Mail, Phone, User, Shield, Info, Fingerprint, Hash
} from "lucide-react";
import { toast } from "sonner";

// Metadata extraction from text
function extractMetadata(text: string): { type: string; value: string; risk: "high" | "medium" | "low" }[] {
  const results: { type: string; value: string; risk: "high" | "medium" | "low" }[] = [];

  // Email addresses
  const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  emails.forEach(e => results.push({ type: "Email", value: e, risk: "high" }));

  // Phone numbers (various formats)
  const phones = text.match(/(?:\+?48)?[\s-]?(?:\d{3}[\s-]?\d{3}[\s-]?\d{3}|\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})/g) ?? [];
  phones.forEach(p => results.push({ type: "Telefon", value: p.trim(), risk: "high" }));

  // IP addresses
  const ips = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) ?? [];
  ips.filter(ip => !ip.startsWith("192.168") && !ip.startsWith("10.") && !ip.startsWith("172.")).forEach(ip => results.push({ type: "IP publiczne", value: ip, risk: "high" }));

  // URLs
  const urls = text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/g) ?? [];
  urls.forEach(u => results.push({ type: "URL", value: u, risk: "medium" }));

  // GPS coordinates
  const gps = text.match(/[-+]?(?:[1-8]?\d(?:\.\d+)?|90(?:\.0+)?),\s*[-+]?(?:180(?:\.0+)?|(?:(?:1[0-7]\d)|(?:[1-9]?\d))(?:\.\d+)?)/g) ?? [];
  gps.forEach(g => results.push({ type: "Koordynaty GPS", value: g, risk: "high" }));

  // Usernames (common patterns)
  const usernames = text.match(/@[a-zA-Z0-9_]{3,20}\b/g) ?? [];
  usernames.forEach(u => results.push({ type: "Nazwa użytkownika", value: u, risk: "medium" }));

  // Bitcoin addresses
  const btc = text.match(/\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g) ?? [];
  btc.forEach(b => results.push({ type: "Adres BTC", value: b, risk: "medium" }));

  // API keys / tokens (generic patterns)
  const apiKeys = text.match(/(?:api[_-]?key|token|secret|password|passwd|pwd)\s*[:=]\s*['"]?([a-zA-Z0-9_\-./+]{16,})/gi) ?? [];
  apiKeys.forEach(k => results.push({ type: "Klucz/Token", value: k.substring(0, 50) + (k.length > 50 ? "..." : ""), risk: "high" }));

  return results;
}

// Digital footprint score
function calcFootprintScore(checks: Record<string, boolean>): number {
  const weights: Record<string, number> = {
    realName: 20, photo: 15, location: 15, employer: 10,
    socialMedia: 10, phone: 10, email: 10, vehicle: 5, family: 5,
  };
  let score = 100;
  for (const [key, exposed] of Object.entries(checks)) {
    if (exposed && weights[key]) score -= weights[key];
  }
  return Math.max(0, score);
}

const OSINT_VECTORS = [
  {
    category: "Tożsamość cyfrowa",
    icon: User,
    color: "text-red-400",
    threats: [
      { name: "Prawdziwe imię i nazwisko", risk: "KRYTYCZNE", mitigation: "Używaj pseudonimu. Nigdy nie łącz prawdziwego imienia z aktywnością online." },
      { name: "Zdjęcia twarzy", risk: "KRYTYCZNE", mitigation: "Unikaj zdjęć twarzy. Używaj awatarów. Wyłącz geolokalizację w EXIF przed publikacją." },
      { name: "Głos (nagrania)", risk: "WYSOKIE", mitigation: "Używaj syntezatora głosu lub zmieniacz głosu dla publicznych nagrań." },
      { name: "Styl pisania (stylometria)", risk: "ŚREDNIE", mitigation: "Zmieniaj styl pisania między tożsamościami. Używaj narzędzi do parafrazowania." },
    ]
  },
  {
    category: "Lokalizacja",
    icon: Globe,
    color: "text-orange-400",
    threats: [
      { name: "Geolokalizacja w zdjęciach (EXIF)", risk: "KRYTYCZNE", mitigation: "Usuń EXIF przed publikacją: ExifTool, mat2. Wyłącz GPS w aparacie." },
      { name: "Check-iny i lokalizacje", risk: "KRYTYCZNE", mitigation: "Nigdy nie publikuj lokalizacji w czasie rzeczywistym. Opóźnij posty o 24-48h." },
      { name: "Adres domowy/biurowy", risk: "KRYTYCZNE", mitigation: "Używaj skrzynki pocztowej lub adresu wirtualnego biura dla korespondencji." },
      { name: "Wzorce ruchu (commute)", risk: "WYSOKIE", mitigation: "Zmieniaj trasy. Używaj różnych środków transportu. Unikaj regularności." },
    ]
  },
  {
    category: "Kontakty i relacje",
    icon: Phone,
    color: "text-yellow-400",
    threats: [
      { name: "Lista kontaktów/znajomych", risk: "WYSOKIE", mitigation: "Ogranicz widoczność listy znajomych. Używaj oddzielnych kont dla różnych kręgów." },
      { name: "Powiązania rodzinne", risk: "WYSOKIE", mitigation: "Nie publikuj informacji o rodzinie. Poproś bliskich o to samo." },
      { name: "Numer telefonu", risk: "WYSOKIE", mitigation: "Używaj VoIP lub prepaid SIM dla publicznych kontaktów. Nigdy nie podawaj głównego numeru." },
      { name: "Adres email", risk: "ŚREDNIE", mitigation: "Używaj aliasów email (SimpleLogin, AnonAddy). Oddzielne adresy dla każdego serwisu." },
    ]
  },
  {
    category: "Aktywność online",
    icon: Search,
    color: "text-blue-400",
    threats: [
      { name: "Historia wyszukiwań", risk: "WYSOKIE", mitigation: "Używaj Tor Browser lub VPN + prywatna wyszukiwarka (SearXNG, DuckDuckGo)." },
      { name: "Fingerprint przeglądarki", risk: "WYSOKIE", mitigation: "Używaj Tor Browser (standaryzuje fingerprint). Lub Brave z agresywnym blokowaniem." },
      { name: "Konta w mediach społecznościowych", risk: "WYSOKIE", mitigation: "Minimalizuj obecność. Używaj pseudonimów. Oddzielne konta dla różnych celów." },
      { name: "Aktywność na forach/GitHub", risk: "ŚREDNIE", mitigation: "Używaj pseudonimów. Nie łącz kont. Sprawdź czy kod nie zawiera danych osobowych." },
    ]
  },
  {
    category: "Infrastruktura techniczna",
    icon: Fingerprint,
    color: "text-purple-400",
    threats: [
      { name: "Adres IP", risk: "WYSOKIE", mitigation: "Używaj VPN lub Tor dla wrażliwej aktywności. Nigdy nie łącz prawdziwego IP z pseudonimem." },
      { name: "User-Agent przeglądarki", risk: "ŚREDNIE", mitigation: "Tor Browser standaryzuje UA. Lub użyj rozszerzenia do zmiany UA." },
      { name: "Timezone i język systemu", risk: "NISKIE", mitigation: "Ustaw UTC i język angielski dla wrażliwych operacji." },
      { name: "Metadane plików (EXIF, Office)", risk: "WYSOKIE", mitigation: "Używaj mat2 lub ExifTool do czyszczenia metadanych przed udostępnieniem." },
    ]
  },
];

const RISK_COLORS: Record<string, string> = {
  "KRYTYCZNE": "bg-red-500/20 text-red-400 border-red-500/30",
  "WYSOKIE": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "ŚREDNIE": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "NISKIE": "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const ANONYMIZATION_TOOLS = [
  { name: "Tor Browser", purpose: "Anonimowe przeglądanie internetu", category: "Sieć", url: "https://torproject.org", free: true },
  { name: "Tails OS", purpose: "Anonimowy system operacyjny (live USB)", category: "OS", url: "https://tails.boum.org", free: true },
  { name: "Whonix", purpose: "OS oparty na Tor (VM)", category: "OS", url: "https://whonix.org", free: true },
  { name: "ExifTool", purpose: "Usuwanie metadanych z plików", category: "Pliki", url: "https://exiftool.org", free: true },
  { name: "mat2", purpose: "Czyszczenie metadanych (Linux)", category: "Pliki", url: "https://0xacab.org/jvoisin/mat2", free: true },
  { name: "SimpleLogin", purpose: "Aliasy email", category: "Email", url: "https://simplelogin.io", free: true },
  { name: "ProtonMail", purpose: "Szyfrowana poczta email", category: "Email", url: "https://proton.me", free: true },
  { name: "Signal", purpose: "Szyfrowane wiadomości i połączenia", category: "Komunikacja", url: "https://signal.org", free: true },
  { name: "SearXNG", purpose: "Prywatna wyszukiwarka (self-hosted)", category: "Wyszukiwanie", url: "https://searxng.org", free: true },
  { name: "KeePassXC", purpose: "Lokalny menedżer haseł", category: "Hasła", url: "https://keepassxc.org", free: true },
  { name: "VeraCrypt", purpose: "Szyfrowanie dysków i kontenerów", category: "Szyfrowanie", url: "https://veracrypt.fr", free: true },
  { name: "BleachBit", purpose: "Bezpieczne usuwanie plików i historii", category: "Czyszczenie", url: "https://bleachbit.org", free: true },
];

export default function OsintDefense() {
  const [metaText, setMetaText] = useState("");
  const [footprintChecks, setFootprintChecks] = useState<Record<string, boolean>>({
    realName: false, photo: false, location: false, employer: false,
    socialMedia: false, phone: false, email: false, vehicle: false, family: false,
  });
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [toolFilter, setToolFilter] = useState<string>("all");

  const extractedMeta = metaText ? extractMetadata(metaText) : [];
  const footprintScore = calcFootprintScore(footprintChecks);
  const scoreColor = footprintScore >= 80 ? "text-green-400" : footprintScore >= 60 ? "text-yellow-400" : footprintScore >= 40 ? "text-orange-400" : "text-red-400";

  const filteredVectors = filterCategory === "all"
    ? OSINT_VECTORS
    : OSINT_VECTORS.filter(v => v.category === filterCategory);

  const toolCategories = ["all", ...Array.from(new Set(ANONYMIZATION_TOOLS.map(t => t.category)))];
  const filteredTools = toolFilter === "all"
    ? ANONYMIZATION_TOOLS
    : ANONYMIZATION_TOOLS.filter(t => t.category === toolFilter);

  const copyMitigation = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Skopiowano"));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-mono flex items-center gap-2">
          <EyeOff className="w-6 h-6 text-primary" />
          OSINT Defense
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Ochrona przed wywiadem open-source, analiza ekspozycji i narzędzia anonimizacji</p>
      </div>

      <Tabs defaultValue="vectors">
        <TabsList className="bg-card border border-border flex-wrap h-auto gap-1">
          <TabsTrigger value="vectors" className="font-mono text-xs">Wektory Zagrożeń</TabsTrigger>
          <TabsTrigger value="footprint" className="font-mono text-xs">Ślad Cyfrowy</TabsTrigger>
          <TabsTrigger value="scanner" className="font-mono text-xs">Skaner Metadanych</TabsTrigger>
          <TabsTrigger value="tools" className="font-mono text-xs">Narzędzia</TabsTrigger>
        </TabsList>

        {/* VECTORS */}
        <TabsContent value="vectors" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterCategory("all")}
              className={`text-xs font-mono ${filterCategory === "all" ? "bg-primary text-primary-foreground" : "border-border"}`}
            >
              Wszystkie
            </Button>
            {OSINT_VECTORS.map(v => (
              <Button
                key={v.category}
                variant={filterCategory === v.category ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterCategory(v.category)}
                className={`text-xs font-mono ${filterCategory === v.category ? "bg-primary text-primary-foreground" : "border-border"}`}
              >
                {v.category}
              </Button>
            ))}
          </div>

          {filteredVectors.map(vector => (
            <Card key={vector.category} className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className={`font-mono text-sm flex items-center gap-2 ${vector.color}`}>
                  <vector.icon className="w-4 h-4" />
                  {vector.category}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {vector.threats.map(threat => (
                  <div key={threat.name} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="font-mono text-sm text-foreground">{threat.name}</span>
                      </div>
                      <Badge className={`text-xs border shrink-0 ${RISK_COLORS[threat.risk]}`}>{threat.risk}</Badge>
                    </div>
                    <div className="flex items-start gap-2">
                      <Shield className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground flex-1">{threat.mitigation}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyMitigation(threat.mitigation)}
                        className="h-6 w-6 p-0 shrink-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* FOOTPRINT */}
        <TabsContent value="footprint" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-mono text-sm text-muted-foreground">Kalkulator Śladu Cyfrowego</CardTitle>
                <p className="text-xs text-muted-foreground">Zaznacz co jest publicznie dostępne o Tobie</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: "realName", label: "Prawdziwe imię i nazwisko", weight: 20 },
                  { key: "photo", label: "Zdjęcia twarzy", weight: 15 },
                  { key: "location", label: "Lokalizacja (miasto/adres)", weight: 15 },
                  { key: "employer", label: "Pracodawca/firma", weight: 10 },
                  { key: "socialMedia", label: "Aktywne konta social media", weight: 10 },
                  { key: "phone", label: "Numer telefonu", weight: 10 },
                  { key: "email", label: "Adres email", weight: 10 },
                  { key: "vehicle", label: "Pojazd (marka/tablica)", weight: 5 },
                  { key: "family", label: "Informacje o rodzinie", weight: 5 },
                ].map(item => (
                  <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={footprintChecks[item.key] ?? false}
                      onChange={e => setFootprintChecks(prev => ({ ...prev, [item.key]: e.target.checked }))}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-sm font-mono text-foreground flex-1">{item.label}</span>
                    <span className="text-xs text-muted-foreground">-{item.weight}pkt</span>
                  </label>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-6 space-y-4">
                <div className="text-center space-y-2">
                  <div className="text-xs text-muted-foreground font-mono">WYNIK PRYWATNOŚCI</div>
                  <div className={`text-6xl font-bold font-mono ${scoreColor}`}>{footprintScore}</div>
                  <div className="text-sm text-muted-foreground">/100</div>
                  <Progress value={footprintScore} className="h-3" />
                  <Badge className={`text-sm ${
                    footprintScore >= 80 ? "bg-green-500/20 text-green-400 border-green-500/30" :
                    footprintScore >= 60 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                    footprintScore >= 40 ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                    "bg-red-500/20 text-red-400 border-red-500/30"
                  } border`}>
                    {footprintScore >= 80 ? "DOBRA PRYWATNOŚĆ" :
                     footprintScore >= 60 ? "UMIARKOWANA EKSPOZYCJA" :
                     footprintScore >= 40 ? "WYSOKA EKSPOZYCJA" : "KRYTYCZNA EKSPOZYCJA"}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  {footprintScore < 80 && (
                    <div className="p-3 bg-background border border-border rounded space-y-1">
                      <div className="text-yellow-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Zalecenia:
                      </div>
                      {footprintChecks.realName && <div className="text-muted-foreground">→ Usuń prawdziwe imię z publicznych profili</div>}
                      {footprintChecks.photo && <div className="text-muted-foreground">→ Usuń zdjęcia twarzy lub zastąp awatarem</div>}
                      {footprintChecks.location && <div className="text-muted-foreground">→ Usuń informacje o lokalizacji</div>}
                      {footprintChecks.phone && <div className="text-muted-foreground">→ Użyj VoIP/prepaid dla publicznych kontaktów</div>}
                      {footprintChecks.email && <div className="text-muted-foreground">→ Użyj aliasu email (SimpleLogin)</div>}
                      {footprintChecks.socialMedia && <div className="text-muted-foreground">→ Ogranicz lub usuń konta social media</div>}
                    </div>
                  )}
                  {footprintScore >= 80 && (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
                      <div className="text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Dobry poziom prywatności!
                      </div>
                      <div className="text-muted-foreground mt-1">Kontynuuj minimalizację śladu cyfrowego.</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* METADATA SCANNER */}
        <TabsContent value="scanner" className="space-y-4 mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-mono text-sm text-muted-foreground">Skaner Metadanych i Danych Wrażliwych</CardTitle>
              <p className="text-xs text-muted-foreground">Wklej tekst (email, post, kod, dokument) aby wykryć dane wrażliwe przed publikacją</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={metaText}
                onChange={e => setMetaText(e.target.value)}
                placeholder="Wklej tutaj tekst do analizy: email, post na forum, kod źródłowy, dokument..."
                className="bg-background border-border font-mono text-sm h-40 resize-none"
              />

              {extractedMeta.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-mono text-red-400">Wykryto {extractedMeta.length} potencjalnie wrażliwych elementów:</span>
                  </div>
                  {extractedMeta.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-background border border-border rounded">
                      <Badge className={`text-xs border shrink-0 ${
                        item.risk === "high" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                        item.risk === "medium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                        "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      }`}>{item.type}</Badge>
                      <code className="text-xs font-mono text-foreground flex-1 truncate">{item.value}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyMitigation(item.value)}
                        className="h-6 w-6 p-0 shrink-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : metaText ? (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-mono text-green-400">Nie wykryto oczywistych danych wrażliwych</span>
                </div>
              ) : null}

              <div className="text-xs text-muted-foreground font-mono p-3 bg-background border border-border rounded">
                <div className="flex items-center gap-1 mb-1">
                  <Info className="w-3 h-3" />
                  Wykrywane elementy:
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div>→ Adresy email</div>
                  <div>→ Numery telefonów</div>
                  <div>→ Adresy IP (publiczne)</div>
                  <div>→ Adresy URL</div>
                  <div>→ Koordynaty GPS</div>
                  <div>→ Nazwy użytkowników (@)</div>
                  <div>→ Adresy Bitcoin</div>
                  <div>→ Klucze API / tokeny</div>
                  <div>→ Hashe (MD5/SHA)</div>
                  <div>→ JWT tokeny</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TOOLS */}
        <TabsContent value="tools" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            {toolCategories.map(cat => (
              <Button
                key={cat}
                variant={toolFilter === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setToolFilter(cat)}
                className={`text-xs font-mono ${toolFilter === cat ? "bg-primary text-primary-foreground" : "border-border"}`}
              >
                {cat === "all" ? "Wszystkie" : cat}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTools.map(tool => (
              <Card key={tool.name} className="bg-card border-border hover:border-primary/40 transition-colors">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-mono font-semibold text-sm text-foreground">{tool.name}</h3>
                    <div className="flex items-center gap-1">
                      {tool.free && <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">FREE</Badge>}
                      <Badge className="text-xs bg-primary/20 text-primary border-primary/30">{tool.category}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{tool.purpose}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                    <Globe className="w-3 h-3" />
                    <span className="truncate">{tool.url.replace("https://", "")}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyMitigation(tool.url)}
                      className="h-5 w-5 p-0 ml-auto shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
