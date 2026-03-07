import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Layers, Image, Music, Video, FileText, Lock, Eye, EyeOff,
  AlertTriangle, CheckCircle, Info, ChevronRight, Cpu, Binary
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StegMethod {
  id: string;
  name: string;
  carrier: string;
  technique: string;
  capacity: string;
  detectability: "low" | "medium" | "high";
  complexity: "low" | "medium" | "high";
  description: string;
  howItWorks: string[];
  tools: string[];
  countermeasures: string[];
  icon: React.ElementType;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const METHODS: StegMethod[] = [
  {
    id: "lsb-image",
    name: "LSB Image Steganography",
    carrier: "Obraz (PNG/BMP)",
    technique: "Least Significant Bit",
    capacity: "~12.5% rozmiaru nośnika",
    detectability: "low",
    complexity: "low",
    icon: Image,
    description: "Zastępowanie najmniej znaczących bitów pikseli danymi ukrytymi. Zmiana jest wizualnie niewidoczna dla ludzkiego oka.",
    howItWorks: [
      "Każdy piksel RGB ma 3 kanały (R, G, B), każdy 8-bitowy",
      "Zastępujemy 1 LSB każdego kanału bitem ukrytej wiadomości",
      "Zmiana wartości piksela o ±1 jest niewidoczna (np. 200 → 201)",
      "Pojemność: (szerokość × wysokość × 3) / 8 bajtów",
      "Przykład: obraz 1920×1080 → pojemność ~777 KB danych"
    ],
    tools: ["Steghide", "OpenStego", "SilentEye", "Python PIL/Pillow", "StegSolve (analiza)"],
    countermeasures: ["Chi-square attack", "RS Analysis", "Sample Pair Analysis", "Histogram comparison"],
  },
  {
    id: "lsb-audio",
    name: "LSB Audio Steganography",
    carrier: "Audio (WAV/AIFF)",
    technique: "Least Significant Bit",
    capacity: "~12.5% rozmiaru nośnika",
    detectability: "low",
    complexity: "low",
    icon: Music,
    description: "Modyfikacja najmniej znaczących bitów próbek audio. Zmiana o 1 LSB jest poniżej progu słyszalności człowieka.",
    howItWorks: [
      "Plik WAV 16-bit: każda próbka ma 16 bitów",
      "Zastępujemy 1 LSB każdej próbki bitem ukrytej wiadomości",
      "Zmiana amplitudy o 1/65536 jest niesłyszalna",
      "Pojemność: (liczba próbek × kanały) / 8 bajtów",
      "Przykład: WAV 44100Hz stereo 60s → pojemność ~661 KB"
    ],
    tools: ["MP3Stego", "DeepSound", "Steghide (WAV)", "Python scipy", "Audacity (analiza)"],
    countermeasures: ["Spectral analysis", "Statistical analysis próbek", "Steganalysis LSB matching"],
  },
  {
    id: "metadata",
    name: "Metadata Steganography",
    carrier: "Dowolny plik",
    technique: "EXIF/XMP/ID3 tags",
    capacity: "Kilka KB",
    detectability: "medium",
    complexity: "low",
    icon: FileText,
    description: "Ukrywanie danych w polach metadanych pliku. Łatwe do wykrycia przez steganalysis, ale często ignorowane przez zwykłych użytkowników.",
    howItWorks: [
      "Pliki JPEG/PNG mają pola EXIF (GPS, kamera, data)",
      "Pola komentarzy, autorów, opisów mogą zawierać dowolny tekst",
      "Pliki MP3 mają tagi ID3 z polami: tytuł, artysta, komentarz",
      "Dokumenty Office/PDF mają rozbudowane metadane",
      "Można też użyć niestandardowych pól XMP"
    ],
    tools: ["ExifTool", "mat2 (usuwanie metadanych)", "Python exifread", "Metadata++"],
    countermeasures: ["ExifTool scan", "mat2 stripping", "Porównanie z oryginałem"],
  },
  {
    id: "whitespace",
    name: "Whitespace Steganography",
    carrier: "Tekst/HTML/kod",
    technique: "Spacje i tabulatory",
    capacity: "Kilkaset bajtów",
    detectability: "medium",
    complexity: "low",
    icon: FileText,
    description: "Kodowanie danych za pomocą spacji i tabulatorów na końcach linii. Niewidoczne w edytorach, ale wykrywalne przez diff.",
    howItWorks: [
      "Spacja na końcu linii = bit 0, tabulator = bit 1",
      "Lub: liczba spacji na końcu linii koduje wartość",
      "Narzędzie SNOW: ukrywa dane w ASCII art i tekstach",
      "Można też używać znaków Unicode zero-width (U+200B, U+FEFF)",
      "Trudne do zauważenia bez specjalnego podglądu"
    ],
    tools: ["SNOW", "stegsnow", "Python skrypty", "Unicode steganography tools"],
    countermeasures: ["diff z oryginałem", "Trailing whitespace check", "Unicode normalization"],
  },
  {
    id: "video-frame",
    name: "Video Frame Steganography",
    carrier: "Video (AVI/MP4)",
    technique: "LSB w klatkach video",
    capacity: "Bardzo duża",
    detectability: "low",
    complexity: "high",
    icon: Video,
    description: "Ukrywanie danych w klatkach wideo przez modyfikację LSB pikseli. Ogromna pojemność dzięki liczbie klatek.",
    howItWorks: [
      "Film 1080p 30fps: 1920×1080×3 bajtów na klatkę",
      "Pojemność 1 klatki: ~777 KB (przy 1 LSB/kanał)",
      "Film 60s × 30fps = 1800 klatek → ~1.4 GB pojemności",
      "Można ukrywać w wybranych klatkach (co N-ta klatka)",
      "Kompresja H.264/H.265 może zniszczyć ukryte dane — używaj AVI/BMP"
    ],
    tools: ["OpenPuff", "StegoVideo", "FFmpeg + własne skrypty", "Python OpenCV"],
    countermeasures: ["Frame-by-frame analysis", "Compression artifacts detection", "Statistical frame comparison"],
  },
  {
    id: "network",
    name: "Network Steganography",
    carrier: "Ruch sieciowy",
    technique: "Covert channels",
    capacity: "Zmienna",
    detectability: "high",
    complexity: "high",
    icon: Cpu,
    description: "Ukrywanie danych w nagłówkach pakietów TCP/IP, timing channels lub nieużywanych polach protokołów.",
    howItWorks: [
      "IP ID field: 16-bit pole może kodować dane",
      "TCP timestamp: manipulacja wartościami czasowymi",
      "ICMP padding: dodatkowe bajty w pakietach ping",
      "DNS queries: kodowanie w subdomenach (np. ZGF0YQ.evil.com)",
      "Timing channel: opóźnienia między pakietami kodują bity"
    ],
    tools: ["Ncovert", "Covert_tcp", "DNScat2", "Iodine (DNS tunnel)", "Scapy"],
    countermeasures: ["DPI (Deep Packet Inspection)", "Traffic analysis", "Anomaly detection IDS", "DNS filtering"],
  },
  {
    id: "transform",
    name: "Transform Domain (DCT/DWT)",
    carrier: "Obraz JPEG",
    technique: "DCT coefficients",
    capacity: "~10% rozmiaru",
    detectability: "low",
    complexity: "high",
    icon: Binary,
    description: "Ukrywanie danych w współczynnikach DCT (JPEG) lub DWT (wavelet). Bardziej odporne na kompresję niż LSB.",
    howItWorks: [
      "JPEG używa DCT (Discrete Cosine Transform) do kompresji",
      "Dane ukrywane są przez modyfikację współczynników DCT",
      "Metoda F5: zmniejsza wartości współczynników o 1",
      "JSteg: zastępuje LSB współczynników DCT",
      "Odporne na recompression, ale podatne na steganalysis"
    ],
    tools: ["F5 algorithm", "JSteg", "OutGuess", "Steghide (JPEG)", "JPHIDE"],
    countermeasures: ["JPEG steganalysis", "DCT histogram analysis", "Calibration attack"],
  },
];

const DETECTION_COLORS = {
  low: "bg-green-500/20 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  high: "bg-red-500/20 text-red-400 border-red-500/30",
};

const COMPLEXITY_COLORS = {
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  medium: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

// ─── LSB Calculator ──────────────────────────────────────────────────────────

function LSBCalculator() {
  const [mediaType, setMediaType] = useState<"image" | "audio" | "video">("image");
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [channels, setChannels] = useState(3);
  const [lsbBits, setLsbBits] = useState(1);
  const [sampleRate, setSampleRate] = useState(44100);
  const [audioBitDepth, setAudioBitDepth] = useState(16);
  const [audioChannels, setAudioChannels] = useState(2);
  const [audioDuration, setAudioDuration] = useState(60);
  const [fps, setFps] = useState(30);
  const [videoDuration, setVideoDuration] = useState(60);
  const [useEveryNthFrame, setUseEveryNthFrame] = useState(1);

  const result = useMemo(() => {
    if (mediaType === "image") {
      const totalPixels = width * height;
      const bitsAvailable = totalPixels * channels * lsbBits;
      const bytesAvailable = Math.floor(bitsAvailable / 8);
      const overheadBytes = 32; // header for length + magic
      const usableBytes = Math.max(0, bytesAvailable - overheadBytes);
      return {
        totalBits: bitsAvailable,
        totalBytes: bytesAvailable,
        usableBytes,
        usableKB: (usableBytes / 1024).toFixed(1),
        usableMB: (usableBytes / 1024 / 1024).toFixed(3),
        carrierSize: `${(width * height * channels / 1024 / 1024).toFixed(1)} MB (BMP)`,
        ratio: ((usableBytes / (width * height * channels)) * 100).toFixed(2),
      };
    } else if (mediaType === "audio") {
      const totalSamples = sampleRate * audioDuration * audioChannels;
      const bitsAvailable = totalSamples * lsbBits;
      const bytesAvailable = Math.floor(bitsAvailable / 8);
      const usableBytes = Math.max(0, bytesAvailable - 32);
      return {
        totalBits: bitsAvailable,
        totalBytes: bytesAvailable,
        usableBytes,
        usableKB: (usableBytes / 1024).toFixed(1),
        usableMB: (usableBytes / 1024 / 1024).toFixed(3),
        carrierSize: `${(sampleRate * audioDuration * audioChannels * (audioBitDepth / 8) / 1024 / 1024).toFixed(1)} MB (WAV)`,
        ratio: ((usableBytes / (sampleRate * audioDuration * audioChannels * (audioBitDepth / 8))) * 100).toFixed(2),
      };
    } else {
      const framesUsed = Math.floor((fps * videoDuration) / useEveryNthFrame);
      const bitsPerFrame = width * height * channels * lsbBits;
      const bitsAvailable = framesUsed * bitsPerFrame;
      const bytesAvailable = Math.floor(bitsAvailable / 8);
      const usableBytes = Math.max(0, bytesAvailable - 32);
      return {
        totalBits: bitsAvailable,
        totalBytes: bytesAvailable,
        usableBytes,
        usableKB: (usableBytes / 1024).toFixed(1),
        usableMB: (usableBytes / 1024 / 1024).toFixed(3),
        carrierSize: `${(fps * videoDuration * width * height * channels / 1024 / 1024 / 1024).toFixed(2)} GB (AVI)`,
        ratio: "N/A",
      };
    }
  }, [mediaType, width, height, channels, lsbBits, sampleRate, audioBitDepth, audioChannels, audioDuration, fps, videoDuration, useEveryNthFrame]);

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-mono text-sm text-primary flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            Kalkulator Pojemności LSB
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Media type selector */}
          <div>
            <Label className="text-xs text-muted-foreground font-mono mb-2 block">Typ nośnika</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["image", "audio", "video"] as const).map((type) => {
                const icons = { image: Image, audio: Music, video: Video };
                const labels = { image: "Obraz", audio: "Audio", video: "Video" };
                const Icon = icons[type];
                return (
                  <button
                    key={type}
                    onClick={() => setMediaType(type)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-md border text-xs font-mono transition-colors ${
                      mediaType === type
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {labels[type]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Image params */}
          {mediaType === "image" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground font-mono mb-1 block">Szerokość (px)</Label>
                <Input
                  type="number"
                  value={width}
                  onChange={e => setWidth(Number(e.target.value))}
                  className="bg-background border-border font-mono text-sm"
                  min={1}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-mono mb-1 block">Wysokość (px)</Label>
                <Input
                  type="number"
                  value={height}
                  onChange={e => setHeight(Number(e.target.value))}
                  className="bg-background border-border font-mono text-sm"
                  min={1}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-mono mb-1 block">Kanały kolorów</Label>
                <Select value={String(channels)} onValueChange={v => setChannels(Number(v))}>
                  <SelectTrigger className="bg-background border-border font-mono text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="1" className="font-mono text-sm">1 (Grayscale)</SelectItem>
                    <SelectItem value="3" className="font-mono text-sm">3 (RGB)</SelectItem>
                    <SelectItem value="4" className="font-mono text-sm">4 (RGBA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-mono mb-1 block">Bity LSB: {lsbBits}</Label>
                <Slider
                  value={[lsbBits]}
                  onValueChange={([v]) => setLsbBits(v)}
                  min={1} max={4} step={1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground font-mono mt-1">
                  <span>1 (niewidoczne)</span>
                  <span>4 (widoczne)</span>
                </div>
              </div>
            </div>
          )}

          {/* Audio params */}
          {mediaType === "audio" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground font-mono mb-1 block">Sample rate (Hz)</Label>
                <Select value={String(sampleRate)} onValueChange={v => setSampleRate(Number(v))}>
                  <SelectTrigger className="bg-background border-border font-mono text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="8000" className="font-mono text-sm">8000 Hz (telefon)</SelectItem>
                    <SelectItem value="22050" className="font-mono text-sm">22050 Hz (radio)</SelectItem>
                    <SelectItem value="44100" className="font-mono text-sm">44100 Hz (CD)</SelectItem>
                    <SelectItem value="48000" className="font-mono text-sm">48000 Hz (studio)</SelectItem>
                    <SelectItem value="96000" className="font-mono text-sm">96000 Hz (hi-res)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-mono mb-1 block">Bit depth</Label>
                <Select value={String(audioBitDepth)} onValueChange={v => setAudioBitDepth(Number(v))}>
                  <SelectTrigger className="bg-background border-border font-mono text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="8" className="font-mono text-sm">8-bit</SelectItem>
                    <SelectItem value="16" className="font-mono text-sm">16-bit (CD)</SelectItem>
                    <SelectItem value="24" className="font-mono text-sm">24-bit (studio)</SelectItem>
                    <SelectItem value="32" className="font-mono text-sm">32-bit (float)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-mono mb-1 block">Kanały</Label>
                <Select value={String(audioChannels)} onValueChange={v => setAudioChannels(Number(v))}>
                  <SelectTrigger className="bg-background border-border font-mono text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="1" className="font-mono text-sm">Mono</SelectItem>
                    <SelectItem value="2" className="font-mono text-sm">Stereo</SelectItem>
                    <SelectItem value="6" className="font-mono text-sm">5.1 Surround</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-mono mb-1 block">Czas trwania (s)</Label>
                <Input
                  type="number"
                  value={audioDuration}
                  onChange={e => setAudioDuration(Number(e.target.value))}
                  className="bg-background border-border font-mono text-sm"
                  min={1}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground font-mono mb-1 block">Bity LSB: {lsbBits}</Label>
                <Slider
                  value={[lsbBits]}
                  onValueChange={([v]) => setLsbBits(v)}
                  min={1} max={4} step={1}
                />
              </div>
            </div>
          )}

          {/* Video params */}
          {mediaType === "video" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground font-mono mb-1 block">Rozdzielczość szer. (px)</Label>
                <Input
                  type="number"
                  value={width}
                  onChange={e => setWidth(Number(e.target.value))}
                  className="bg-background border-border font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-mono mb-1 block">Rozdzielczość wys. (px)</Label>
                <Input
                  type="number"
                  value={height}
                  onChange={e => setHeight(Number(e.target.value))}
                  className="bg-background border-border font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-mono mb-1 block">FPS</Label>
                <Select value={String(fps)} onValueChange={v => setFps(Number(v))}>
                  <SelectTrigger className="bg-background border-border font-mono text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="24" className="font-mono text-sm">24 fps (film)</SelectItem>
                    <SelectItem value="25" className="font-mono text-sm">25 fps (PAL)</SelectItem>
                    <SelectItem value="30" className="font-mono text-sm">30 fps (NTSC)</SelectItem>
                    <SelectItem value="60" className="font-mono text-sm">60 fps (gaming)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-mono mb-1 block">Czas trwania (s)</Label>
                <Input
                  type="number"
                  value={videoDuration}
                  onChange={e => setVideoDuration(Number(e.target.value))}
                  className="bg-background border-border font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-mono mb-1 block">Co N-ta klatka: {useEveryNthFrame}</Label>
                <Slider
                  value={[useEveryNthFrame]}
                  onValueChange={([v]) => setUseEveryNthFrame(v)}
                  min={1} max={30} step={1}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-mono mb-1 block">Bity LSB: {lsbBits}</Label>
                <Slider
                  value={[lsbBits]}
                  onValueChange={([v]) => setLsbBits(v)}
                  min={1} max={4} step={1}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-mono text-sm text-muted-foreground">Wyniki Kalkulacji</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-background/50 rounded-lg p-4 border border-border">
              <div className="text-xs text-muted-foreground font-mono mb-1">Pojemność użytkowa</div>
              <div className="text-2xl font-bold font-mono text-primary">{formatBytes(result.usableBytes)}</div>
              <div className="text-xs text-muted-foreground font-mono mt-1">{result.usableKB} KB / {result.usableMB} MB</div>
            </div>
            <div className="bg-background/50 rounded-lg p-4 border border-border">
              <div className="text-xs text-muted-foreground font-mono mb-1">Całkowite bity</div>
              <div className="text-xl font-bold font-mono text-foreground">{(result.totalBits / 1_000_000).toFixed(2)}M</div>
              <div className="text-xs text-muted-foreground font-mono mt-1">{formatBytes(result.totalBytes)} raw</div>
            </div>
            <div className="bg-background/50 rounded-lg p-4 border border-border">
              <div className="text-xs text-muted-foreground font-mono mb-1">Rozmiar nośnika</div>
              <div className="text-lg font-bold font-mono text-foreground">{result.carrierSize}</div>
              {result.ratio !== "N/A" && (
                <div className="text-xs text-muted-foreground font-mono mt-1">Ratio: {result.ratio}%</div>
              )}
            </div>
          </div>

          {/* Detectability warning */}
          {lsbBits > 2 && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-400 font-mono">
                <strong>Uwaga:</strong> Użycie {lsbBits} bitów LSB może być widoczne gołym okiem i jest łatwo wykrywalne przez steganalysis. Zalecane: 1-2 bity LSB.
              </div>
            </div>
          )}
          {lsbBits === 1 && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-md">
              <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <div className="text-xs text-green-400 font-mono">
                1 bit LSB: optymalna równowaga między pojemnością a wykrywalnością. Zmiana jest statystycznie trudna do odróżnienia od szumu kwantyzacji.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SteganographyGuide() {
  const [selectedMethod, setSelectedMethod] = useState<StegMethod | null>(null);
  const [filterDetect, setFilterDetect] = useState<string>("all");

  const filteredMethods = METHODS.filter(m =>
    filterDetect === "all" || m.detectability === filterDetect
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            Steganografia
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Przewodnik po metodach ukrywania danych w mediach cyfrowych i kalkulator pojemności nośnika
          </p>
        </div>
        <Badge className="bg-primary/20 text-primary border-primary/30 font-mono text-xs">
          WIEDZA OPERACYJNA
        </Badge>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-400 font-mono space-y-1">
          <p><strong>Steganografia</strong> to nauka o ukrywaniu informacji w nośnikach tak, aby samo istnienie ukrytej wiadomości było niewidoczne.</p>
          <p>W odróżnieniu od kryptografii (która ukrywa <em>treść</em>), steganografia ukrywa <em>fakt istnienia</em> komunikacji.</p>
          <p>Najlepsze bezpieczeństwo: <strong>steganografia + kryptografia</strong> (najpierw zaszyfruj, potem ukryj).</p>
        </div>
      </div>

      <Tabs defaultValue="methods">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="methods" className="font-mono text-xs">Metody ({METHODS.length})</TabsTrigger>
          <TabsTrigger value="calculator" className="font-mono text-xs">Kalkulator LSB</TabsTrigger>
          <TabsTrigger value="detection" className="font-mono text-xs">Wykrywanie</TabsTrigger>
          <TabsTrigger value="opsec" className="font-mono text-xs">OPSEC</TabsTrigger>
        </TabsList>

        {/* METHODS TAB */}
        <TabsContent value="methods" className="mt-4 space-y-4">
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono self-center">Wykrywalność:</span>
            {["all", "low", "medium", "high"].map(f => (
              <button
                key={f}
                onClick={() => setFilterDetect(f)}
                className={`px-3 py-1 text-xs font-mono rounded-md border transition-colors ${
                  filterDetect === f
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {f === "all" ? "Wszystkie" : f === "low" ? "Niska" : f === "medium" ? "Średnia" : "Wysoka"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedMethod?.id === method.id;
              return (
                <Card
                  key={method.id}
                  className={`bg-card border cursor-pointer transition-all hover:border-primary/50 ${
                    isSelected ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  onClick={() => setSelectedMethod(isSelected ? null : method)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold font-mono text-foreground">{method.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{method.carrier} · {method.technique}</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Badge className={`text-xs font-mono border ${DETECTION_COLORS[method.detectability]}`}>
                        <Eye className="w-3 h-3 mr-1" />
                        Wykrywalność: {method.detectability === "low" ? "Niska" : method.detectability === "medium" ? "Średnia" : "Wysoka"}
                      </Badge>
                      <Badge className={`text-xs font-mono border ${COMPLEXITY_COLORS[method.complexity]}`}>
                        Złożoność: {method.complexity === "low" ? "Niska" : method.complexity === "medium" ? "Średnia" : "Wysoka"}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">{method.description}</p>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-muted-foreground">Pojemność:</span>
                      <span className="text-primary">{method.capacity}</span>
                    </div>

                    {/* Expanded details */}
                    {isSelected && (
                      <div className="pt-3 border-t border-border space-y-3">
                        <div>
                          <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Jak działa:</p>
                          <ul className="space-y-1">
                            {method.howItWorks.map((step, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                                <span className="text-primary font-mono shrink-0">{i + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Narzędzia:</p>
                          <div className="flex flex-wrap gap-1">
                            {method.tools.map(tool => (
                              <span key={tool} className="px-2 py-0.5 bg-background border border-border rounded text-xs font-mono text-foreground">
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Środki zaradcze:</p>
                          <div className="flex flex-wrap gap-1">
                            {method.countermeasures.map(cm => (
                              <span key={cm} className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-xs font-mono text-red-400">
                                {cm}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* CALCULATOR TAB */}
        <TabsContent value="calculator" className="mt-4">
          <LSBCalculator />
        </TabsContent>

        {/* DETECTION TAB */}
        <TabsContent value="detection" className="mt-4 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-mono text-sm text-primary flex items-center gap-2">
                <EyeOff className="w-4 h-4" />
                Techniki Wykrywania Steganografii (Steganalysis)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  name: "Chi-square Attack",
                  target: "LSB Image",
                  description: "Analiza statystyczna par wartości pikseli. Steganografia LSB zaburza naturalny rozkład chi-kwadrat.",
                  tools: ["StegSolve", "Stegdetect", "Python scipy"],
                  effectiveness: "high",
                },
                {
                  name: "RS Analysis (Regular-Singular)",
                  target: "LSB Image",
                  description: "Klasyfikacja grup pikseli jako Regular/Singular/Unusable. Steganografia zmienia proporcje R/S.",
                  tools: ["RsAnalysis", "Stegexpose"],
                  effectiveness: "high",
                },
                {
                  name: "Sample Pair Analysis",
                  target: "LSB Audio",
                  description: "Analiza par sąsiednich próbek audio. Embedding LSB zmienia statystyki par.",
                  tools: ["SPA tool", "StegSpy"],
                  effectiveness: "medium",
                },
                {
                  name: "Histogram Analysis",
                  target: "LSB Image/Audio",
                  description: "Porównanie histogramu nośnika z oczekiwanym. Steganografia tworzy charakterystyczne 'pary' wartości.",
                  tools: ["GIMP histogram", "Audacity spectrum", "Python matplotlib"],
                  effectiveness: "medium",
                },
                {
                  name: "DCT Histogram Analysis",
                  target: "JPEG (F5/JSteg)",
                  description: "Analiza rozkładu współczynników DCT. Embedding zmienia charakterystyczny kształt histogramu.",
                  tools: ["JPEG steganalysis tools", "StegDetect"],
                  effectiveness: "high",
                },
                {
                  name: "Visual Attack",
                  target: "LSB Image (>2 bity)",
                  description: "Wizualizacja tylko bitów LSB. Przy >2 LSB ukryte dane są widoczne jako szum lub wzory.",
                  tools: ["StegSolve (bit planes)", "GIMP channels"],
                  effectiveness: "medium",
                },
                {
                  name: "File Format Analysis",
                  target: "Metadata",
                  description: "Sprawdzenie niestandardowych pól EXIF/ID3/XMP. Nieoczekiwane pola lub wartości wskazują na steganografię.",
                  tools: ["ExifTool", "Binwalk", "Strings"],
                  effectiveness: "high",
                },
              ].map((technique) => (
                <div key={technique.name} className="p-4 bg-background/50 rounded-lg border border-border space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-sm font-bold font-mono text-foreground">{technique.name}</h3>
                    <div className="flex gap-2">
                      <Badge className="text-xs font-mono bg-blue-500/20 text-blue-400 border-blue-500/30">
                        {technique.target}
                      </Badge>
                      <Badge className={`text-xs font-mono border ${
                        technique.effectiveness === "high"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      }`}>
                        Skuteczność: {technique.effectiveness === "high" ? "Wysoka" : "Średnia"}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{technique.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {technique.tools.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-card border border-border rounded text-xs font-mono text-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* OPSEC TAB */}
        <TabsContent value="opsec" className="mt-4 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-mono text-sm text-primary flex items-center gap-2">
                <Lock className="w-4 h-4" />
                OPSEC dla Steganografii
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  category: "Przed ukryciem",
                  icon: CheckCircle,
                  color: "text-green-400",
                  items: [
                    "Zawsze szyfruj dane przed ukryciem (AES-256-GCM)",
                    "Używaj silnego hasła/klucza do steganografii",
                    "Wybierz nośnik o naturalnie wysokiej entropii (zdjęcia z aparatu, nie generowane komputerowo)",
                    "Upewnij się, że nośnik nie był wcześniej przesyłany (brak historii EXIF)",
                    "Usuń metadane z nośnika przed i po operacji",
                  ],
                },
                {
                  category: "Wybór nośnika",
                  icon: Image,
                  color: "text-blue-400",
                  items: [
                    "Preferuj pliki PNG/BMP zamiast JPEG (kompresja JPEG niszczy LSB)",
                    "Używaj zdjęć z aparatu (naturalna entropia) zamiast grafik komputerowych",
                    "Nośnik powinien być 'wiarygodny' w kontekście komunikacji",
                    "Unikaj nośników z dużymi jednolitymi obszarami (łatwe do analizy)",
                    "Dla audio: WAV/AIFF zamiast MP3 (kompresja stratna niszczy LSB)",
                  ],
                },
                {
                  category: "Transmisja",
                  icon: AlertTriangle,
                  color: "text-yellow-400",
                  items: [
                    "Nie przesyłaj nośnika przez kanały z automatyczną rekomresją (WhatsApp, Instagram)",
                    "Używaj kanałów zachowujących oryginalne bajty (e-mail z załącznikiem, SFTP)",
                    "Rozważ dead drop zamiast bezpośredniej transmisji",
                    "Nie używaj tego samego nośnika wielokrotnie",
                    "Usuń pliki tymczasowe po operacji (secure wipe)",
                  ],
                },
                {
                  category: "Kontrwywiad",
                  icon: EyeOff,
                  color: "text-red-400",
                  items: [
                    "Zakładaj, że przeciwnik ma narzędzia steganalysis",
                    "Używaj metod transform domain (DCT) zamiast LSB dla krytycznych danych",
                    "Rozważ 'cover traffic' — regularne przesyłanie nośników bez ukrytych danych",
                    "Nie używaj popularnych narzędzi (Steghide, OpenStego) — są dobrze znane",
                    "Implementuj własne, niestandardowe schematy dla najwyższego bezpieczeństwa",
                  ],
                },
              ].map((section) => {
                const Icon = section.icon;
                return (
                  <div key={section.category} className="space-y-2">
                    <h3 className={`text-sm font-bold font-mono flex items-center gap-2 ${section.color}`}>
                      <Icon className="w-4 h-4" />
                      {section.category}
                    </h3>
                    <ul className="space-y-1.5 pl-6">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                          <span className={`shrink-0 mt-0.5 ${section.color}`}>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
