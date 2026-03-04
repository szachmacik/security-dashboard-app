import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { BookOpen, Plus, RefreshCw, ChevronDown, ChevronUp, Shield, Radio, Volume2, Wifi, Lock, Cpu } from "lucide-react";
import { useState } from "react";

const categoryConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  air_gap: { label: "Air-Gap", icon: Shield, color: "text-green-400" },
  optical: { label: "Optyczny", icon: Cpu, color: "text-blue-400" },
  acoustic: { label: "Akustyczny", icon: Volume2, color: "text-purple-400" },
  physical: { label: "Fizyczny", icon: Shield, color: "text-orange-400" },
  network: { label: "Sieciowy", icon: Wifi, color: "text-yellow-400" },
  cryptographic: { label: "Kryptograficzny", icon: Lock, color: "text-red-400" },
};

const difficultyConfig: Record<string, { label: string; color: string }> = {
  beginner: { label: "PODSTAWOWY", color: "text-green-400 bg-green-400/10 border-green-400/30" },
  intermediate: { label: "ŚREDNI", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  advanced: { label: "ZAAWANSOWANY", color: "text-orange-400 bg-orange-400/10 border-orange-400/30" },
  expert: { label: "EKSPERT", color: "text-red-400 bg-red-400/10 border-red-400/30" },
};

const riskConfig: Record<string, { label: string; color: string }> = {
  low: { label: "NISKIE", color: "text-green-400" },
  medium: { label: "ŚREDNIE", color: "text-yellow-400" },
  high: { label: "WYSOKIE", color: "text-orange-400" },
  critical: { label: "KRYTYCZNE", color: "text-red-400" },
};

function ProtocolCard({ protocol }: { protocol: any }) {
  const [expanded, setExpanded] = useState(false);
  const cat = categoryConfig[protocol.category] || { label: protocol.category, icon: BookOpen, color: "text-muted-foreground" };
  const diff = difficultyConfig[protocol.difficulty] || { label: protocol.difficulty, color: "text-muted-foreground" };
  const risk = riskConfig[protocol.riskLevel] || { label: protocol.riskLevel, color: "text-muted-foreground" };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-muted shrink-0`}>
              <cat.icon className={`w-5 h-5 ${cat.color}`} />
            </div>
            <div>
              <h3 className="font-medium text-foreground font-mono text-sm">{protocol.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs font-mono ${cat.color}`}>{cat.label}</span>
                <span className="text-muted-foreground text-xs">·</span>
                <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${diff.color}`}>{diff.label}</span>
                <span className="text-muted-foreground text-xs">·</span>
                <span className="text-xs text-muted-foreground">Ryzyko: <span className={risk.color}>{risk.label}</span></span>
              </div>
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {protocol.description && (
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{protocol.description}</p>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border">
          {protocol.instructions && (
            <div className="p-5 space-y-2">
              <p className="text-xs font-mono text-muted-foreground tracking-wider">INSTRUKCJA WDROŻENIA</p>
              <div className="bg-muted/30 rounded-lg p-4">
                <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">{protocol.instructions}</pre>
              </div>
            </div>
          )}
          {protocol.requirements && (
            <div className="px-5 pb-5 space-y-2">
              <p className="text-xs font-mono text-muted-foreground tracking-wider">WYMAGANIA</p>
              <div className="bg-muted/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground font-mono">{protocol.requirements}</p>
              </div>
            </div>
          )}
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

  const filtered = protocols.filter(p => {
    if (activeCategory !== "all" && p.category !== activeCategory) return false;
    if (activeDifficulty !== "all" && p.difficulty !== activeDifficulty) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground tracking-wide">BIBLIOTEKA PROTOKOŁÓW</h1>
          <p className="text-sm text-muted-foreground mt-1">Metody bezpiecznego transferu i izolacji danych</p>
        </div>
        <div className="flex gap-2">
          {protocols.length === 0 && (
            <Button size="sm" variant="outline" className="gap-2 font-mono text-xs" onClick={() => seedMutation.mutate()}>
              <RefreshCw className="w-4 h-4" />Załaduj Wbudowane
            </Button>
          )}
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
      <div className="flex gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-mono self-center">Poziom:</span>
        {["all", "beginner", "intermediate", "advanced", "expert"].map(d => (
          <button key={d} onClick={() => setActiveDifficulty(d)}
            className={`px-2 py-1 rounded text-xs font-mono transition-all ${activeDifficulty === d ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"}`}>
            {d === "all" ? "Wszystkie" : difficultyConfig[d]?.label || d}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Ładowanie protokołów...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">Brak protokołów w tej kategorii</p>
          {protocols.length === 0 && (
            <Button className="mt-4 font-mono" onClick={() => seedMutation.mutate()}>
              Załaduj wbudowane protokoły
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(protocol => (
            <ProtocolCard key={protocol.id} protocol={protocol} />
          ))}
        </div>
      )}
    </div>
  );
}
