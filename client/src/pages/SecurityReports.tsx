import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  FileText, Plus, Download, Trash2, Eye, TrendingUp, TrendingDown,
  Minus, BarChart2, RefreshCw, Shield, Calendar, AlertTriangle
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart
} from "recharts";
import { Streamdown } from "streamdown";

const REPORT_TYPES = [
  { value: "weekly", label: "Tygodniowy" },
  { value: "monthly", label: "Miesięczny" },
  { value: "incident", label: "Incydentowy" },
  { value: "audit", label: "Audytowy" },
  { value: "custom", label: "Własny" },
];

const TYPE_COLORS: Record<string, string> = {
  weekly: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  monthly: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  incident: "bg-red-500/20 text-red-400 border-red-500/30",
  audit: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  custom: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

function ScoreColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

export default function SecurityReports() {
  const [generateOpen, setGenerateOpen] = useState(false);
  const [viewReport, setViewReport] = useState<{ id: number; title: string } | null>(null);
  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState<string>("weekly");
  const [historyDays, setHistoryDays] = useState(30);

  const utils = trpc.useUtils();
  const { data: reports, isLoading: reportsLoading } = trpc.reports.list.useQuery();
  const { data: history, isLoading: historyLoading } = trpc.scoreHistory.get.useQuery({ days: historyDays });
  const { data: historyStats } = trpc.scoreHistory.stats.useQuery();
  const { data: reportContent, isLoading: contentLoading } = trpc.reports.getContent.useQuery(
    { id: viewReport?.id ?? 0 },
    { enabled: !!viewReport }
  );

  const snapshotMutation = trpc.scoreHistory.snapshot.useMutation({
    onSuccess: (data) => {
      if (data) {
        toast.success(`Snapshot zapisany — Score: ${data.score}/100`);
        utils.scoreHistory.get.invalidate();
        utils.scoreHistory.stats.invalidate();
      }
    },
    onError: () => toast.error("Błąd zapisu snapshotu"),
  });

  const generateMutation = trpc.reports.generate.useMutation({
    onSuccess: () => {
      toast.success("Raport wygenerowany!");
      utils.reports.list.invalidate();
      setGenerateOpen(false);
      setTitle("");
    },
    onError: () => toast.error("Błąd generowania raportu"),
  });

  const deleteMutation = trpc.reports.delete.useMutation({
    onSuccess: () => {
      toast.success("Raport usunięty");
      utils.reports.list.invalidate();
    },
  });

  // Auto-snapshot on mount
  useEffect(() => {
    snapshotMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = () => {
    if (!title.trim()) { toast.error("Podaj tytuł raportu"); return; }
    generateMutation.mutate({ title: title.trim(), reportType: reportType as "weekly" | "monthly" | "incident" | "audit" | "custom" });
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename.replace(/[^a-z0-9]/gi, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = (history ?? []).map(h => ({
    date: new Date(h.recordedAt).toLocaleDateString("pl-PL", { month: "short", day: "numeric" }),
    score: h.score,
    incidents: h.openIncidents,
    threats: h.activeThreats,
  }));

  const TrendIcon = historyStats?.trend === "up" ? TrendingUp : historyStats?.trend === "down" ? TrendingDown : Minus;
  const trendColor = historyStats?.trend === "up" ? "text-green-400" : historyStats?.trend === "down" ? "text-red-400" : "text-gray-400";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-primary" />
            Raporty & Trendy
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Historia Security Score i generowanie raportów bezpieczeństwa</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => snapshotMutation.mutate()}
            disabled={snapshotMutation.isPending}
            className="border-border"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${snapshotMutation.isPending ? "animate-spin" : ""}`} />
            Zapisz Snapshot
          </Button>
          <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Generuj Raport
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-mono">Generuj Raport Bezpieczeństwa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label className="text-muted-foreground text-xs mb-1 block">Tytuł raportu</Label>
                  <Input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="np. Raport tygodniowy 2026-W10"
                    className="bg-background border-border font-mono text-sm"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs mb-1 block">Typ raportu</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger className="bg-background border-border font-mono text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {REPORT_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value} className="font-mono text-sm">{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={generateMutation.isPending}
                    className="flex-1 bg-primary text-primary-foreground"
                  >
                    {generateMutation.isPending ? "Generuję..." : "Generuj"}
                  </Button>
                  <Button variant="outline" onClick={() => setGenerateOpen(false)} className="border-border">
                    Anuluj
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="trends">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="trends" className="font-mono text-xs">Trendy Score</TabsTrigger>
          <TabsTrigger value="reports" className="font-mono text-xs">Historia Raportów</TabsTrigger>
        </TabsList>

        {/* TRENDS TAB */}
        <TabsContent value="trends" className="space-y-4 mt-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground font-mono mb-1">Aktualny Score</div>
                <div className="text-2xl font-bold font-mono" style={{ color: ScoreColor(historyStats?.current ?? 0) }}>
                  {historyStats?.current ?? "—"}<span className="text-sm text-muted-foreground">/100</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground font-mono mb-1">Trend</div>
                <div className={`text-2xl font-bold font-mono flex items-center gap-1 ${trendColor}`}>
                  <TrendIcon className="w-5 h-5" />
                  {historyStats?.trend === "up" ? "Wzrost" : historyStats?.trend === "down" ? "Spadek" : "Stabilny"}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground font-mono mb-1">Min/Max (7 dni)</div>
                <div className="text-lg font-bold font-mono">
                  <span style={{ color: ScoreColor(historyStats?.min7d ?? 0) }}>{historyStats?.min7d ?? "—"}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span style={{ color: ScoreColor(historyStats?.max7d ?? 100) }}>{historyStats?.max7d ?? "—"}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground font-mono mb-1">Śr. 30 dni</div>
                <div className="text-2xl font-bold font-mono" style={{ color: ScoreColor(historyStats?.avg30d ?? 0) }}>
                  {historyStats?.avg30d ?? "—"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="font-mono text-sm text-muted-foreground">Historia Security Score</CardTitle>
                <div className="flex gap-1">
                  {[7, 14, 30, 60, 90].map(d => (
                    <Button
                      key={d}
                      variant={historyDays === d ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHistoryDays(d)}
                      className={`text-xs px-2 py-1 h-7 font-mono ${historyDays === d ? "bg-primary text-primary-foreground" : "border-border"}`}
                    >
                      {d}d
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground font-mono text-sm">Ładowanie...</div>
              ) : chartData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <BarChart2 className="w-12 h-12 opacity-30" />
                  <p className="font-mono text-sm">Brak danych historycznych</p>
                  <p className="text-xs">Kliknij "Zapisz Snapshot" aby dodać pierwszy punkt</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "JetBrains Mono" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "JetBrains Mono" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontFamily: "JetBrains Mono", fontSize: "12px" }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="3 3" opacity={0.5} label={{ value: "BEZPIECZNY", fill: "#22c55e", fontSize: 9 }} />
                    <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} label={{ value: "KRYTYCZNY", fill: "#ef4444", fontSize: 9 }} />
                    <Area type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} fill="url(#scoreGrad)" dot={{ fill: "#22c55e", r: 3 }} name="Score" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Incidents & Threats trend */}
          {chartData.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-mono text-sm text-muted-foreground">Incydenty & Zagrożenia w czasie</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "JetBrains Mono" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "JetBrains Mono" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontFamily: "JetBrains Mono", fontSize: "12px" }}
                    />
                    <Line type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Incydenty" />
                    <Line type="monotone" dataKey="threats" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="Zagrożenia" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* REPORTS TAB */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          {reportsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-card rounded-lg border border-border animate-pulse" />
              ))}
            </div>
          ) : !reports?.length ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <FileText className="w-12 h-12 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground font-mono text-sm">Brak raportów</p>
                <p className="text-xs text-muted-foreground">Kliknij "Generuj Raport" aby stworzyć pierwszy raport</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <Card key={report.id} className="bg-card border-border hover:border-primary/40 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                          <h3 className="font-mono font-semibold text-sm text-foreground truncate">{report.title}</h3>
                          <Badge className={`text-xs border ${TYPE_COLORS[report.reportType] ?? TYPE_COLORS.custom}`}>
                            {REPORT_TYPES.find(t => t.value === report.reportType)?.label ?? report.reportType}
                          </Badge>
                          {report.score !== null && (
                            <span className="text-xs font-mono font-bold" style={{ color: ScoreColor(report.score) }}>
                              {report.score}/100
                            </span>
                          )}
                        </div>
                        {report.summary && (
                          <p className="text-xs text-muted-foreground font-mono truncate">{report.summary}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(report.createdAt).toLocaleString("pl-PL")}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewReport({ id: report.id, title: report.title })}
                              className="border-border h-8 w-8 p-0"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-card border-border max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="font-mono text-sm">{viewReport?.title}</DialogTitle>
                            </DialogHeader>
                            <div className="mt-2">
                              {contentLoading ? (
                                <div className="text-muted-foreground font-mono text-sm">Ładowanie...</div>
                              ) : reportContent ? (
                                <div className="prose prose-invert prose-sm max-w-none">
                                  <Streamdown>{reportContent}</Streamdown>
                                </div>
                              ) : (
                                <div className="text-muted-foreground font-mono text-sm">Brak treści</div>
                              )}
                            </div>
                            {reportContent && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(reportContent, viewReport?.title ?? "raport")}
                                className="border-border mt-2"
                              >
                                <Download className="w-3 h-3 mr-2" />
                                Pobierz .md
                              </Button>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const content = await utils.reports.getContent.fetch({ id: report.id });
                            if (content) handleDownload(content, report.title);
                          }}
                          className="border-border h-8 w-8 p-0"
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { if (confirm("Usunąć raport?")) deleteMutation.mutate({ id: report.id }); }}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* View Report Dialog */}
    </div>
  );
}
