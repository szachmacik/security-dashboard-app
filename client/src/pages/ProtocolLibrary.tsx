import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  BookOpen, RefreshCw, ChevronDown, ChevronUp, Shield, Volume2, Wifi,
  Lock, Cpu, Search, Download, Star, Clock, AlertTriangle, CheckCircle,
  Copy, ExternalLink
} from "lucide-react";
import { useState, useMemo } from "react";

const categoryConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  air_gap: { label: "Air-Gap", icon: Shield, color: "text-green-400", bg: "bg-green-400/10" },
  optical: { label: "Optyczny", icon: Cpu, color: "text-blue-400", bg: "bg-blue-400/10" },
  acoustic: { label: "Akustyczny", icon: Volume2, color: "text-purple-400", bg: "bg-purple-400/10" },
  physical: { label: "Fizyczny", icon: Shield, color: "text-orange-400", bg: "bg-orange-400/10" },
  network: { label: "Sieciowy", icon: Wifi, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  cryptographic: { label: "Kryptograficzny", icon: Lock, color: "text-red-400", bg: "bg-red-400/10" },
};

const difficultyConfig: Record<string, { label: string; color: string; stars: number }> = {
  beginner: { label: "PODSTAWOWY", color: "text-green-400 bg-green-400/10 border-green-400/30", stars: 1 },
  intermediate: { label: "ŚREDNI", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30", stars: 2 },
  advanced: { label: "ZAAWANSOWANY", color: "text-orange-400 bg-orange-400/10 border-orange-400/30", stars: 3 },
  expert: { label: "EKSPERT", color: "text-red-400 bg-red-400/10 border-red-400/30", stars: 4 },
};

const riskConfig: Record<string, { label: string; color: string }> = {
  low: { label: "NISKIE", color: "text-green-400" },
  medium: { label: "ŚREDNIE", color: "text-yellow-400" },
  high: { label: "WYSOKIE", color: "text-orange-400" },
  critical: { label: "KRYTYCZNE", color: "text-red-400" },
};

// Security score for protocol based on category and risk
function getSecurityScore(protocol: { category: string; riskLevel: string; difficulty: string }): number {
  let score = 50;
  if (protocol.category === "air_gap") score += 40;
  else if (protocol.category === "cryptographic") score += 35;
  else if (protocol.category === "physical") score += 25;
  else if (protocol.category === "optical") score += 20;
  else if (protocol.category === "acoustic") score += 15;
  else if (protocol.category === "network") score += 5;

  if (protocol.riskLevel === "low") score += 10;
  else if (protocol.riskLevel === "medium") score -= 5;
  else if (protocol.riskLevel === "high") score -= 15;
  else if (protocol.riskLevel === "critical") score -= 25;

  return Math.min(100, Math.max(0, score));
}

function DifficultyStars({ difficulty }: { difficulty: string }) {
  const cfg = difficultyConfig[difficulty];
  if (!cfg) return null;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= cfg.stars ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

function ProtocolCard({ protocol, compare, onToggleCompare }: {
  protocol: any;
  compare: boolean;
  onToggleCompare: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cat = categoryConfig[protocol.category] || { label: protocol.category, icon: BookOpen, color: "text-muted-foreground", bg: "bg-muted" };
  const diff = difficultyConfig[protocol.difficulty] || { label: protocol.difficulty, color: "text-muted-foreground", stars: 0 };
  const risk = riskConfig[protocol.riskLevel] || { label: protocol.riskLevel, color: "text-muted-foreground" };
  const secScore = getSecurityScore(protocol);

  const copyInstructions = () => {
    if (protocol.instructions) {
      navigator.clipboard.writeText(protocol.instructions);
      toast.success("Instrukcja skopiowana");
    }
  };

  return (
    <div className={`bg-card border rounded-xl overflow-hidden transition-all ${compare ? "border-primary" : "border-border hover:border-primary/30"}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg ${cat.bg} shrink-0`}>
              <cat.icon className={`w-5 h-5 ${cat.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-foreground font-mono text-sm">{protocol.name}</h3>
                {protocol.isBuiltIn && (
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">WBUDOWANY</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`text-xs font-mono ${cat.color}`}>{cat.label}</span>
                <span className="text-muted-foreground text-xs">·</span>
                <DifficultyStars difficulty={protocol.difficulty} />
                <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${diff.color}`}>{diff.label}</span>
                <span className="text-muted-foreground text-xs">·</span>
                <span className="text-xs text-muted-foreground">Ryzyko: <span className={risk.color}>{risk.label}</span></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <p className="text-xs font-mono text-muted-foreground">Bezp.</p>
              <p className={`text-sm font-bold font-mono ${secScore >= 80 ? "text-green-400" : secScore >= 60 ? "text-yellow-400" : "text-red-400"}`}>{secScore}</p>
            </div>
            <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {protocol.description && (
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{protocol.description}</p>
        )}

        {/* Security score bar */}
        <div className="mt-3">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${secScore >= 80 ? "bg-green-400" : secScore >= 60 ? "bg-yellow-400" : "bg-red-400"}`}
              style={{ width: `${secScore}%` }}
            />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border">
          {protocol.instructions && (
            <div className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono text-muted-foreground tracking-wider">INSTRUKCJA WDROŻENIA</p>
                <button onClick={copyInstructions} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-xs font-mono">
                  <Copy className="w-3 h-3" />Kopiuj
                </button>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">{protocol.instructions}</pre>
              </div>
            </div>
          )}
          {protocol.requirements && (
            <div className="px-5 pb-5 space-y-2">
              <p className="text-xs font-mono text-muted-foreground tracking-wider">WYMAGANIA SPRZĘTOWE/PROGRAMOWE</p>
              <div className="bg-muted/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground font-mono">{protocol.requirements}</p>
              </div>
            </div>
          )}
          {/* Security analysis */}
          <div className="px-5 pb-5 space-y-2">
            <p className="text-xs font-mono text-muted-foreground tracking-wider">ANALIZA BEZPIECZEŃSTWA</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Poziom ochrony</p>
                <p className={`text-sm font-bold font-mono ${secScore >= 80 ? "text-green-400" : secScore >= 60 ? "text-yellow-400" : "text-red-400"}`}>{secScore}/100</p>
              </div>
              <div className="bg-muted/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Złożoność</p>
                <p className="text-sm font-bold font-mono text-foreground">{diff.label}</p>
              </div>
            </div>
            <div className="space-y-1">
              {protocol.category === "air_gap" && <p className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Całkowita izolacja od sieci</p>}
              {protocol.category === "cryptographic" && <p className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Silna ochrona kryptograficzna</p>}
              {protocol.riskLevel === "high" && <p className="text-xs text-orange-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Wymaga starannej implementacji</p>}
              {protocol.riskLevel === "critical" && <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Tylko dla zaawansowanych użytkowników</p>}
              {protocol.difficulty === "beginner" && <p className="text-xs text-blue-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Łatwy do wdrożenia</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProtocolLibrary() {
  const utils = trpc.useUtils();
  const { data: protocols = [], isLoading } = trpc.protocols.list.useQuery();
  const seedMutation = trpc.protocols.seedBuiltIn.useMutation({
    onSuccess: () => { toast.success("Wbudowane protokoły załadowane"); utils.protocols.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const [activeCategory, setActiveCategory] = useState("all");
  const [activeDifficulty, setActiveDifficulty] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"security" | "difficulty" | "name">("security");
  const [compareList, setCompareList] = useState<number[]>([]);

  const filtered = useMemo(() => {
    let list = protocols.filter(p => {
      if (activeCategory !== "all" && p.category !== activeCategory) return false;
      if (activeDifficulty !== "all" && p.difficulty !== activeDifficulty) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !(p.description || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "security") return getSecurityScore(b) - getSecurityScore(a);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      const diffOrder = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
      return (diffOrder[a.difficulty as keyof typeof diffOrder] || 0) - (diffOrder[b.difficulty as keyof typeof diffOrder] || 0);
    });
    return list;
  }, [protocols, activeCategory, activeDifficulty, search, sortBy]);

  const toggleCompare = (id: number) => {
    setCompareList(prev => prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const exportProtocols = () => {
    const lines = ["# BIBLIOTEKA PROTOKOŁÓW BEZPIECZEŃSTWA", `# Data: ${new Date().toLocaleDateString("pl-PL")}`, ""];
    filtered.forEach(p => {
      lines.push(`## ${p.name}`);
      lines.push(`- Kategoria: ${p.category}`);
      lines.push(`- Poziom: ${p.difficulty}`);
      lines.push(`- Ryzyko: ${p.riskLevel}`);
      lines.push(`- Bezpieczeństwo: ${getSecurityScore(p)}/100`);
      if (p.description) lines.push(`- Opis: ${p.description}`);
      if (p.instructions) lines.push(`\n### Instrukcja:\n${p.instructions}`);
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `protocols-${new Date().toISOString().slice(0, 10)}.md`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Protokoły wyeksportowane");
  };

  const avgSecurity = protocols.length > 0
    ? Math.round(protocols.reduce((sum, p) => sum + getSecurityScore(p), 0) / protocols.length)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground tracking-wide">BIBLIOTEKA PROTOKOŁÓW</h1>
          <p className="text-sm text-muted-foreground mt-1">Metody bezpiecznego transferu i izolacji danych</p>
        </div>
        <div className="flex gap-2">
          {protocols.length > 0 && (
            <Button size="sm" variant="outline" className="gap-2 font-mono text-xs" onClick={exportProtocols}>
              <Download className="w-3.5 h-3.5" />Eksportuj
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-2 font-mono text-xs" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            <RefreshCw className={`w-3.5 h-3.5 ${seedMutation.isPending ? "animate-spin" : ""}`} />
            {protocols.length === 0 ? "Załaduj Wbudowane" : "Odśwież"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      {protocols.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold font-mono text-foreground">{protocols.length}</p>
            <p className="text-xs text-muted-foreground font-mono">Protokołów</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className={`text-2xl font-bold font-mono ${avgSecurity >= 70 ? "text-green-400" : avgSecurity >= 50 ? "text-yellow-400" : "text-red-400"}`}>{avgSecurity}</p>
            <p className="text-xs text-muted-foreground font-mono">Śr. bezpieczeństwo</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold font-mono text-green-400">{protocols.filter(p => p.riskLevel === "low").length}</p>
            <p className="text-xs text-muted-foreground font-mono">Niskie ryzyko</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold font-mono text-blue-400">{protocols.filter(p => p.isBuiltIn).length}</p>
            <p className="text-xs text-muted-foreground font-mono">Wbudowanych</p>
          </div>
        </div>
      )}

      {/* Search & Sort */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Szukaj protokołu..." className="pl-9 bg-input font-mono text-xs h-9" />
        </div>
        <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
          <span>Sortuj:</span>
          {[
            { key: "security", label: "Bezp." },
            { key: "difficulty", label: "Poziom" },
            { key: "name", label: "Nazwa" },
          ].map(s => (
            <button key={s.key} onClick={() => setSortBy(s.key as any)}
              className={`px-2 py-1 rounded transition-colors ${sortBy === s.key ? "bg-primary/20 text-primary" : "hover:text-foreground"}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setActiveCategory("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${activeCategory === "all" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
          Wszystkie ({protocols.length})
        </button>
        {Object.entries(categoryConfig).map(([key, cfg]) => {
          const count = protocols.filter(p => p.category === key).length;
          if (count === 0) return null;
          return (
            <button key={key} onClick={() => setActiveCategory(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${activeCategory === key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
              <cfg.icon className="w-3 h-3" />{cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Difficulty Filter */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-muted-foreground font-mono">Poziom trudności:</span>
        {["all", "beginner", "intermediate", "advanced", "expert"].map(d => (
          <button key={d} onClick={() => setActiveDifficulty(d)}
            className={`px-2 py-1 rounded text-xs font-mono transition-all ${activeDifficulty === d ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"}`}>
            {d === "all" ? "Wszystkie" : difficultyConfig[d]?.label || d}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="flex gap-3">
                <div className="w-9 h-9 bg-muted rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">{search ? "Brak wyników dla szukanej frazy" : "Brak protokołów w tej kategorii"}</p>
          {protocols.length === 0 && (
            <Button className="mt-4 font-mono" onClick={() => seedMutation.mutate()}>
              Załaduj wbudowane protokoły
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(protocol => (
            <ProtocolCard
              key={protocol.id}
              protocol={protocol}
              compare={compareList.includes(protocol.id)}
              onToggleCompare={() => toggleCompare(protocol.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
