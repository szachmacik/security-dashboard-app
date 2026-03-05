import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Key, Eye, EyeOff, Copy, RefreshCw, Shield, AlertTriangle,
  CheckCircle2, XCircle, Info, Zap, Lock, Hash
} from "lucide-react";

// ─── Password Analysis ────────────────────────────────────────────────────────

interface PasswordAnalysis {
  score: number; // 0-100
  strength: "very_weak" | "weak" | "fair" | "strong" | "very_strong";
  entropy: number;
  crackTime: string;
  checks: {
    label: string;
    passed: boolean;
    weight: number;
  }[];
  suggestions: string[];
  charsetSize: number;
}

const COMMON_PASSWORDS = new Set([
  "password", "123456", "qwerty", "abc123", "password1", "admin", "letmein",
  "welcome", "monkey", "dragon", "master", "sunshine", "princess", "football",
  "shadow", "superman", "michael", "baseball", "iloveyou", "trustno1"
]);

function analyzePassword(password: string): PasswordAnalysis {
  if (!password) {
    return {
      score: 0, strength: "very_weak", entropy: 0, crackTime: "natychmiast",
      checks: [], suggestions: ["Wprowadź hasło do analizy"], charsetSize: 0
    };
  }

  const len = password.length;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const hasLongSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
  const isCommon = COMMON_PASSWORDS.has(password.toLowerCase());
  const hasRepeat = /(.)\1{2,}/.test(password);
  const hasSequential = /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password);

  // Charset size
  let charsetSize = 0;
  if (hasLower) charsetSize += 26;
  if (hasUpper) charsetSize += 26;
  if (hasDigit) charsetSize += 10;
  if (hasSpecial) charsetSize += 32;

  // Entropy: log2(charsetSize^len)
  const entropy = charsetSize > 0 ? Math.log2(Math.pow(charsetSize, len)) : 0;

  // Crack time (assuming 10^12 guesses/sec for GPU)
  const guesses = Math.pow(charsetSize || 1, len);
  const guessesPerSec = 1e12;
  const seconds = guesses / guessesPerSec;
  let crackTime: string;
  if (seconds < 1) crackTime = "natychmiast";
  else if (seconds < 60) crackTime = `${Math.round(seconds)} sekund`;
  else if (seconds < 3600) crackTime = `${Math.round(seconds / 60)} minut`;
  else if (seconds < 86400) crackTime = `${Math.round(seconds / 3600)} godzin`;
  else if (seconds < 2592000) crackTime = `${Math.round(seconds / 86400)} dni`;
  else if (seconds < 31536000) crackTime = `${Math.round(seconds / 2592000)} miesięcy`;
  else if (seconds < 3153600000) crackTime = `${Math.round(seconds / 31536000)} lat`;
  else crackTime = "ponad 100 lat";

  const checks = [
    { label: "Min. 12 znaków", passed: len >= 12, weight: 20 },
    { label: "Min. 16 znaków (zalecane)", passed: len >= 16, weight: 10 },
    { label: "Małe litery (a-z)", passed: hasLower, weight: 10 },
    { label: "Wielkie litery (A-Z)", passed: hasUpper, weight: 15 },
    { label: "Cyfry (0-9)", passed: hasDigit, weight: 15 },
    { label: "Znaki specjalne (!@#...)", passed: hasSpecial, weight: 20 },
    { label: "Rozbudowane znaki specjalne", passed: hasLongSpecial, weight: 5 },
    { label: "Nie jest popularnym hasłem", passed: !isCommon, weight: 15 },
    { label: "Brak powtarzających się znaków (aaa)", passed: !hasRepeat, weight: 5 },
    { label: "Brak sekwencji (abc, 123)", passed: !hasSequential, weight: 5 },
  ];

  let score = 0;
  for (const check of checks) {
    if (check.passed) score += check.weight;
  }

  // Penalize short passwords
  if (len < 8) score = Math.min(score, 20);
  if (isCommon) score = Math.min(score, 10);

  score = Math.min(100, Math.max(0, score));

  const strength: PasswordAnalysis["strength"] =
    score >= 85 ? "very_strong" :
    score >= 70 ? "strong" :
    score >= 50 ? "fair" :
    score >= 25 ? "weak" : "very_weak";

  const suggestions: string[] = [];
  if (len < 16) suggestions.push("Zwiększ długość do min. 16 znaków");
  if (!hasUpper) suggestions.push("Dodaj wielkie litery (A-Z)");
  if (!hasLower) suggestions.push("Dodaj małe litery (a-z)");
  if (!hasDigit) suggestions.push("Dodaj cyfry (0-9)");
  if (!hasSpecial) suggestions.push("Dodaj znaki specjalne (!@#$%^&*)");
  if (hasRepeat) suggestions.push("Usuń powtarzające się znaki");
  if (hasSequential) suggestions.push("Unikaj sekwencji (abc, 123)");
  if (isCommon) suggestions.push("To jest popularne hasło — zmień je natychmiast!");
  if (entropy < 50) suggestions.push("Zwiększ entropię przez losowe znaki");

  return { score, strength, entropy: Math.round(entropy), crackTime, checks, suggestions, charsetSize };
}

// ─── Password Generator ───────────────────────────────────────────────────────

interface GeneratorOptions {
  length: number;
  useLower: boolean;
  useUpper: boolean;
  useDigits: boolean;
  useSpecial: boolean;
  useExtendedSpecial: boolean;
  excludeAmbiguous: boolean;
  count: number;
}

function generatePassword(opts: GeneratorOptions): string {
  let charset = "";
  const lower = opts.excludeAmbiguous ? "abcdefghjkmnpqrstuvwxyz" : "abcdefghijklmnopqrstuvwxyz";
  const upper = opts.excludeAmbiguous ? "ABCDEFGHJKMNPQRSTUVWXYZ" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = opts.excludeAmbiguous ? "23456789" : "0123456789";
  const special = "!@#$%^&*";
  const extSpecial = "!@#$%^&*()-_=+[]{}|;:,.<>?";

  if (opts.useLower) charset += lower;
  if (opts.useUpper) charset += upper;
  if (opts.useDigits) charset += digits;
  if (opts.useExtendedSpecial) charset += extSpecial;
  else if (opts.useSpecial) charset += special;

  if (!charset) charset = lower + upper + digits;

  const array = new Uint32Array(opts.length);
  crypto.getRandomValues(array);
  return Array.from(array, x => charset[x % charset.length]).join("");
}

function generatePassphrase(wordCount: number): string {
  const words = [
    "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel",
    "india", "juliet", "kilo", "lima", "mike", "november", "oscar", "papa",
    "quebec", "romeo", "sierra", "tango", "uniform", "victor", "whiskey",
    "xray", "yankee", "zulu", "secure", "bunker", "cipher", "vault", "shield",
    "ghost", "phantom", "shadow", "falcon", "eagle", "hawk", "raven", "wolf",
    "tiger", "dragon", "cobra", "viper", "storm", "thunder", "lightning",
    "crystal", "diamond", "sapphire", "emerald", "onyx", "obsidian", "granite"
  ];
  const array = new Uint32Array(wordCount);
  crypto.getRandomValues(array);
  const selected = Array.from(array, x => words[x % words.length]);
  const numArray = new Uint32Array(1);
  crypto.getRandomValues(numArray);
  return selected.join("-") + "-" + (numArray[0] % 9000 + 1000);
}

// ─── Entropy Calculator ───────────────────────────────────────────────────────

const STRENGTH_CONFIG = {
  very_weak: { label: "BARDZO SŁABE", color: "text-red-400", bg: "bg-red-500", barColor: "bg-red-500" },
  weak: { label: "SŁABE", color: "text-orange-400", bg: "bg-orange-500", barColor: "bg-orange-500" },
  fair: { label: "ŚREDNIE", color: "text-yellow-400", bg: "bg-yellow-500", barColor: "bg-yellow-500" },
  strong: { label: "SILNE", color: "text-green-400", bg: "bg-green-500", barColor: "bg-green-500" },
  very_strong: { label: "BARDZO SILNE", color: "text-cyan-400", bg: "bg-cyan-500", barColor: "bg-cyan-500" },
};

export default function PasswordEvaluator() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [genOpts, setGenOpts] = useState<GeneratorOptions>({
    length: 24,
    useLower: true,
    useUpper: true,
    useDigits: true,
    useSpecial: true,
    useExtendedSpecial: false,
    excludeAmbiguous: true,
    count: 5,
  });
  const [generatedPasswords, setGeneratedPasswords] = useState<string[]>([]);
  const [passphraseCount, setPassphraseCount] = useState(4);
  const [passphrases, setPassphrases] = useState<string[]>([]);

  const analysis = useMemo(() => analyzePassword(password), [password]);
  const strengthConfig = STRENGTH_CONFIG[analysis.strength];

  const handleGenerate = useCallback(() => {
    const passwords = Array.from({ length: genOpts.count }, () => generatePassword(genOpts));
    setGeneratedPasswords(passwords);
  }, [genOpts]);

  const handleGeneratePassphrases = useCallback(() => {
    const phrases = Array.from({ length: 5 }, () => generatePassphrase(passphraseCount));
    setPassphrases(phrases);
  }, [passphraseCount]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Skopiowano do schowka");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-mono font-bold text-slate-100 flex items-center gap-2">
          <Key className="w-6 h-6 text-yellow-400" />
          PASSWORD EVALUATOR
        </h1>
        <p className="text-slate-400 text-sm mt-1">Ocena siły haseł, generator i kalkulator entropii — wszystko lokalnie, bez wysyłania danych</p>
      </div>

      <Tabs defaultValue="analyze" className="space-y-4">
        <TabsList className="bg-slate-900 border border-slate-700">
          <TabsTrigger value="analyze" className="font-mono data-[state=active]:bg-slate-700">ANALIZA</TabsTrigger>
          <TabsTrigger value="generate" className="font-mono data-[state=active]:bg-slate-700">GENERATOR</TabsTrigger>
          <TabsTrigger value="passphrase" className="font-mono data-[state=active]:bg-slate-700">PASSPHRASE</TabsTrigger>
          <TabsTrigger value="guide" className="font-mono data-[state=active]:bg-slate-700">PORADNIK</TabsTrigger>
        </TabsList>

        {/* ─── ANALYZE TAB ─── */}
        <TabsContent value="analyze" className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-sm font-mono text-slate-400">WPROWADŹ HASŁO DO ANALIZY</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Wpisz hasło..."
                  className="bg-slate-800 border-slate-700 text-slate-100 font-mono pr-20 text-lg"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200"
                    onClick={() => copyToClipboard(password)}
                    disabled={!password}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {password && (
                <>
                  {/* Strength Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-mono font-bold ${strengthConfig.color}`}>
                        {strengthConfig.label}
                      </span>
                      <span className="text-sm font-mono text-slate-400">{analysis.score}/100</span>
                    </div>
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${strengthConfig.barColor}`}
                        style={{ width: `${analysis.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <p className="text-xl font-mono font-bold text-slate-100">{password.length}</p>
                      <p className="text-xs text-slate-500 font-mono">ZNAKI</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <p className="text-xl font-mono font-bold text-cyan-400">{analysis.entropy}</p>
                      <p className="text-xs text-slate-500 font-mono">BITY ENTROPII</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <p className="text-xl font-mono font-bold text-purple-400">{analysis.charsetSize}</p>
                      <p className="text-xs text-slate-500 font-mono">ZESTAW ZNAKÓW</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <p className="text-sm font-mono font-bold text-orange-400 leading-tight">{analysis.crackTime}</p>
                      <p className="text-xs text-slate-500 font-mono">CZAS ZŁAMANIA*</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 font-mono">* Zakładając 10¹² prób/sekundę (GPU cluster)</p>

                  {/* Checks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {analysis.checks.map((check, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {check.passed
                          ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        }
                        <span className={`font-mono text-xs ${check.passed ? "text-slate-300" : "text-slate-500"}`}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Suggestions */}
                  {analysis.suggestions.length > 0 && (
                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                      <p className="text-xs font-mono text-yellow-400 mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> SUGESTIE POPRAWY
                      </p>
                      <ul className="space-y-1">
                        {analysis.suggestions.map((s, i) => (
                          <li key={i} className="text-xs text-slate-400 font-mono flex items-start gap-1">
                            <span className="text-yellow-500 mt-0.5">→</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── GENERATE TAB ─── */}
        <TabsContent value="generate" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Options */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-sm font-mono text-slate-400">OPCJE GENERATORA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-400 text-xs font-mono">DŁUGOŚĆ: {genOpts.length} ZNAKÓW</Label>
                  <input
                    type="range" min={8} max={128} value={genOpts.length}
                    onChange={e => setGenOpts(o => ({ ...o, length: +e.target.value }))}
                    className="w-full mt-2 accent-cyan-500"
                  />
                  <div className="flex justify-between text-xs text-slate-600 font-mono mt-1">
                    <span>8</span><span>32</span><span>64</span><span>128</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { key: "useLower" as const, label: "Małe litery (a-z)" },
                    { key: "useUpper" as const, label: "Wielkie litery (A-Z)" },
                    { key: "useDigits" as const, label: "Cyfry (0-9)" },
                    { key: "useSpecial" as const, label: "Znaki specjalne (!@#$%^&*)" },
                    { key: "useExtendedSpecial" as const, label: "Rozbudowane znaki specjalne" },
                    { key: "excludeAmbiguous" as const, label: "Wyklucz niejednoznaczne (0,O,l,1)" },
                  ].map(opt => (
                    <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={genOpts[opt.key]}
                        onChange={e => setGenOpts(o => ({ ...o, [opt.key]: e.target.checked }))}
                        className="accent-cyan-500"
                      />
                      <span className="text-xs text-slate-300 font-mono">{opt.label}</span>
                    </label>
                  ))}
                </div>

                <div>
                  <Label className="text-slate-400 text-xs font-mono">LICZBA HASEŁ: {genOpts.count}</Label>
                  <input
                    type="range" min={1} max={20} value={genOpts.count}
                    onChange={e => setGenOpts(o => ({ ...o, count: +e.target.value }))}
                    className="w-full mt-2 accent-cyan-500"
                  />
                </div>

                <Button
                  className="w-full bg-cyan-600 hover:bg-cyan-700 font-mono"
                  onClick={handleGenerate}
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> GENERUJ HASŁA
                </Button>
              </CardContent>
            </Card>

            {/* Generated */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-sm font-mono text-slate-400">WYGENEROWANE HASŁA</CardTitle>
              </CardHeader>
              <CardContent>
                {generatedPasswords.length === 0 ? (
                  <div className="text-center py-8 text-slate-600">
                    <Key className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-mono">Kliknij "GENERUJ HASŁA"</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {generatedPasswords.map((pwd, i) => {
                      const a = analyzePassword(pwd);
                      const sc = STRENGTH_CONFIG[a.strength];
                      return (
                        <div key={i} className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-2">
                          <code className="flex-1 text-xs font-mono text-slate-200 break-all">{pwd}</code>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className={`text-xs font-mono ${sc.color}`}>{a.score}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200"
                              onClick={() => {
                                setPassword(pwd);
                                toast.success("Hasło przeniesione do analizy");
                              }}
                            >
                              <Zap className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200"
                              onClick={() => copyToClipboard(pwd)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── PASSPHRASE TAB ─── */}
        <TabsContent value="passphrase" className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-sm font-mono text-slate-400 flex items-center gap-2">
                <Hash className="w-4 h-4 text-purple-400" /> GENERATOR PASSPHRASE (Diceware-style)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-slate-400 font-mono">
                Passphrase to ciąg losowych słów — łatwiejszy do zapamiętania niż hasło, ale równie bezpieczny.
                Zalecane: min. 4 słowa + liczba = ~60 bitów entropii.
              </p>
              <div>
                <Label className="text-slate-400 text-xs font-mono">LICZBA SŁÓW: {passphraseCount}</Label>
                <input
                  type="range" min={3} max={8} value={passphraseCount}
                  onChange={e => setPassphraseCount(+e.target.value)}
                  className="w-full mt-2 accent-purple-500"
                />
              </div>
              <Button
                className="bg-purple-600 hover:bg-purple-700 font-mono"
                onClick={handleGeneratePassphrases}
              >
                <RefreshCw className="w-4 h-4 mr-2" /> GENERUJ PASSPHRASE
              </Button>

              {passphrases.length > 0 && (
                <div className="space-y-2">
                  {passphrases.map((phrase, i) => {
                    const a = analyzePassword(phrase);
                    return (
                      <div key={i} className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-3">
                        <code className="flex-1 text-sm font-mono text-purple-300">{phrase}</code>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                            {a.entropy}b
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200"
                            onClick={() => copyToClipboard(phrase)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── GUIDE TAB ─── */}
        <TabsContent value="guide" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Minimalne wymagania OPSEC",
                icon: <Shield className="w-5 h-5 text-cyan-400" />,
                items: [
                  "Min. 16 znaków dla haseł kont",
                  "Min. 20 znaków dla kluczy kryptograficznych",
                  "Min. 4 słowa dla passphrase",
                  "Unikalność — inne hasło dla każdego konta",
                  "Przechowywanie w menedżerze haseł (KeePassXC)",
                  "Regularna rotacja co 90 dni dla krytycznych kont",
                ]
              },
              {
                title: "Entropia — co to znaczy?",
                icon: <Hash className="w-5 h-5 text-purple-400" />,
                items: [
                  "< 28 bitów: bardzo słabe (chwilowe złamanie)",
                  "28-35 bitów: słabe (minuty/godziny)",
                  "36-59 bitów: rozsądne (dni/miesiące)",
                  "60-127 bitów: silne (lata/dekady)",
                  "> 128 bitów: bardzo silne (niemożliwe do złamania)",
                  "Zalecane minimum: 80 bitów",
                ]
              },
              {
                title: "Menedżery haseł (offline)",
                icon: <Lock className="w-5 h-5 text-green-400" />,
                items: [
                  "KeePassXC — open source, lokalny, AES-256",
                  "Bitwarden (self-hosted) — web + desktop",
                  "Pass — CLI, GPG-based, Unix",
                  "Vaultwarden — self-hosted Bitwarden",
                  "Unikaj chmurowych menedżerów haseł",
                  "Backup bazy danych na zaszyfrowanym nośniku",
                ]
              },
              {
                title: "Klucze kryptograficzne",
                icon: <Key className="w-5 h-5 text-yellow-400" />,
                items: [
                  "RSA: min. 4096 bitów (2048 niewystarczające)",
                  "Ed25519: zalecane dla SSH (256-bit, szybkie)",
                  "AES: min. 256 bitów (AES-128 zbyt słabe)",
                  "Passphrase na kluczu prywatnym: obowiązkowa",
                  "Rotacja kluczy SSH co 12 miesięcy",
                  "Klucze PGP: min. 4096-bit RSA lub Ed25519",
                ]
              },
            ].map((section, i) => (
              <Card key={i} className="bg-slate-900/50 border-slate-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-mono text-slate-300 flex items-center gap-2">
                    {section.icon} {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {section.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-slate-400 font-mono">
                        <span className="text-cyan-500 mt-0.5 flex-shrink-0">▸</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-mono text-amber-400 font-bold">WAŻNE: Bezpieczeństwo analizy</p>
                <p className="text-xs text-slate-400 mt-1">
                  Analiza haseł odbywa się <strong className="text-slate-200">wyłącznie lokalnie w przeglądarce</strong> — żadne hasło nie jest wysyłane na serwer ani zapisywane.
                  Używaj tej funkcji tylko do testowania siły haseł, nigdy nie wpisuj tutaj aktywnych haseł do ważnych kont.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
