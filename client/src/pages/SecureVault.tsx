import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Lock, Unlock, Plus, Trash2, Eye, EyeOff, Copy, Download,
  Upload, Key, CreditCard, FileText, Cpu, AlertTriangle, Shield,
  RefreshCw, Search, Info, CheckCircle
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type VaultItemType = "password" | "api_key" | "seed_phrase" | "note" | "certificate" | "ssh_key";

interface VaultItem {
  id: string;
  type: VaultItemType;
  title: string;
  username?: string;
  value: string;
  url?: string;
  notes?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

interface VaultData {
  version: 1;
  items: VaultItem[];
  createdAt: number;
}

// ─── Crypto Helpers ───────────────────────────────────────────────────────────

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  const saltBuf = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
  return window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBuf, iterations: 600000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptVault(data: VaultData, password: string): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(32));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const result = new Uint8Array(32 + 12 + ciphertext.byteLength);
  result.set(salt, 0);
  result.set(iv, 32);
  result.set(new Uint8Array(ciphertext), 44);
  let binary = "";
  for (let i = 0; i < result.length; i++) binary += String.fromCharCode(result[i]);
  return btoa(binary);
}

async function decryptVault(encryptedB64: string, password: string): Promise<VaultData> {
  const binary = atob(encryptedB64);
  const data = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i);
  const salt = data.slice(0, 32);
  const iv = data.slice(32, 44);
  const ciphertext = data.slice(44);
  const key = await deriveKey(password, salt);
  const ciphertextBuf = ciphertext.buffer.slice(ciphertext.byteOffset, ciphertext.byteOffset + ciphertext.byteLength) as ArrayBuffer;
  const plaintext = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertextBuf);
  return JSON.parse(new TextDecoder().decode(plaintext)) as VaultData;
}

function generateId(): string {
  const arr = window.crypto.getRandomValues(new Uint8Array(8));
  let hex = "";
  for (let i = 0; i < arr.length; i++) hex += arr[i].toString(16).padStart(2, "0");
  return hex;
}

function generatePassword(length = 24): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_=+";
  const arr = window.crypto.getRandomValues(new Uint8Array(length));
  let result = "";
  for (let i = 0; i < arr.length; i++) result += chars[arr[i] % chars.length];
  return result;
}

// ─── Item Type Config ─────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<VaultItemType, { label: string; icon: React.ElementType; color: string; placeholder: string }> = {
  password: { label: "Hasło", icon: Key, color: "text-blue-400", placeholder: "Hasło do konta..." },
  api_key: { label: "Klucz API", icon: Cpu, color: "text-purple-400", placeholder: "sk-... lub Bearer token..." },
  seed_phrase: { label: "Seed Phrase", icon: Shield, color: "text-red-400", placeholder: "12 lub 24 słowa BIP-39..." },
  note: { label: "Notatka", icon: FileText, color: "text-green-400", placeholder: "Poufna notatka..." },
  certificate: { label: "Certyfikat", icon: CreditCard, color: "text-yellow-400", placeholder: "-----BEGIN CERTIFICATE-----..." },
  ssh_key: { label: "Klucz SSH", icon: Key, color: "text-orange-400", placeholder: "-----BEGIN OPENSSH PRIVATE KEY-----..." },
};

// ─── Unlock Screen ────────────────────────────────────────────────────────────

function UnlockScreen({ onUnlock }: { onUnlock: (password: string, isNew: boolean) => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [mode, setMode] = useState<"unlock" | "new">("new");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (password.length < 8) { toast.error("Hasło musi mieć min. 8 znaków"); return; }
    if (password !== confirm) { toast.error("Hasła nie są identyczne"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 100));
    onUnlock(password, true);
    setLoading(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      // Store encrypted data in sessionStorage temporarily
      sessionStorage.setItem("vault_import", content);
      setMode("unlock");
      toast.info("Plik wczytany — podaj hasło do odszyfrowania");
    };
    reader.readAsText(file);
  };

  const handleUnlock = async () => {
    if (!password) { toast.error("Podaj hasło"); return; }
    const importData = sessionStorage.getItem("vault_import");
    if (importData) {
      setLoading(true);
      try {
        await decryptVault(importData, password);
        onUnlock(password, false);
      } catch {
        toast.error("Błędne hasło lub uszkodzony plik vault");
      } finally {
        setLoading(false);
      }
    } else {
      onUnlock(password, false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="bg-card border-border w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl font-mono">Secure Vault</CardTitle>
          <p className="text-sm text-muted-foreground">Zaszyfrowany sejf — AES-256-GCM, PBKDF2 600k iteracji</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-400 font-mono">
              Klucz szyfrowania istnieje <strong>tylko w pamięci RAM</strong> podczas sesji. Dane nie są wysyłane na serwer. Jeśli zapomnisz hasła — dane są nie do odzyskania.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setMode("new")}
              className={`flex-1 py-2 text-xs font-mono rounded-md border transition-colors ${mode === "new" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
            >
              Nowy vault
            </button>
            <button
              onClick={() => setMode("unlock")}
              className={`flex-1 py-2 text-xs font-mono rounded-md border transition-colors ${mode === "unlock" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
            >
              Otwórz istniejący
            </button>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground font-mono mb-1 block">Hasło główne</Label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Silne hasło główne..."
                className="bg-background border-border font-mono text-sm pr-8"
                onKeyDown={e => e.key === "Enter" && (mode === "new" ? handleCreate() : handleUnlock())}
              />
              <button onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {mode === "new" && (
            <div>
              <Label className="text-xs text-muted-foreground font-mono mb-1 block">Potwierdź hasło</Label>
              <Input
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Powtórz hasło..."
                className="bg-background border-border font-mono text-sm"
                onKeyDown={e => e.key === "Enter" && handleCreate()}
              />
            </div>
          )}

          {mode === "new" ? (
            <Button onClick={handleCreate} disabled={loading} className="w-full bg-primary text-primary-foreground">
              {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Utwórz nowy vault
            </Button>
          ) : (
            <Button onClick={handleUnlock} disabled={loading} className="w-full bg-primary text-primary-foreground">
              {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />}
              Odblokuj vault
            </Button>
          )}

          {mode === "unlock" && (
            <div className="text-center">
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" className="border-border" asChild>
                  <span><Upload className="w-4 h-4 mr-2" /> Importuj plik .vault</span>
                </Button>
                <input ref={fileRef} type="file" accept=".vault,.json" className="hidden" onChange={handleImport} />
              </label>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Add/Edit Item Dialog ─────────────────────────────────────────────────────

function ItemDialog({
  open, onClose, onSave, initial
}: {
  open: boolean;
  onClose: () => void;
  onSave: (item: Omit<VaultItem, "id" | "createdAt" | "updatedAt">) => void;
  initial?: VaultItem;
}) {
  const [type, setType] = useState<VaultItemType>(initial?.type ?? "password");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [value, setValue] = useState(initial?.value ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [showValue, setShowValue] = useState(false);

  const handleSave = () => {
    if (!title.trim()) { toast.error("Podaj tytuł"); return; }
    if (!value.trim()) { toast.error("Podaj wartość"); return; }
    onSave({
      type, title: title.trim(), username: username.trim() || undefined,
      value: value.trim(), url: url.trim() || undefined,
      notes: notes.trim() || undefined,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
    });
    onClose();
  };

  const cfg = TYPE_CONFIG[type];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">{initial ? "Edytuj wpis" : "Nowy wpis w vault"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground font-mono mb-1 block">Typ</Label>
            <Select value={type} onValueChange={v => setType(v as VaultItemType)}>
              <SelectTrigger className="bg-background border-border font-mono text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {(Object.entries(TYPE_CONFIG) as [VaultItemType, typeof TYPE_CONFIG[VaultItemType]][]).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="font-mono text-sm">
                    <span className={v.color}>{v.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground font-mono mb-1 block">Tytuł</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="np. GitHub Personal Token" className="bg-background border-border font-mono text-sm" />
          </div>

          {(type === "password") && (
            <div>
              <Label className="text-xs text-muted-foreground font-mono mb-1 block">Login / Email</Label>
              <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="user@example.com" className="bg-background border-border font-mono text-sm" />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-muted-foreground font-mono">{cfg.label}</Label>
              <div className="flex gap-1">
                {type === "password" && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setValue(generatePassword())}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Generuj
                  </Button>
                )}
                <button onClick={() => setShowValue(!showValue)} className="text-muted-foreground hover:text-foreground">
                  {showValue ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            {type === "note" || type === "seed_phrase" || type === "certificate" || type === "ssh_key" ? (
              <Textarea
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={cfg.placeholder}
                className="bg-background border-border font-mono text-sm min-h-[100px] resize-none"
                style={{ WebkitTextSecurity: showValue ? "none" : "disc" } as React.CSSProperties}
              />
            ) : (
              <Input
                type={showValue ? "text" : "password"}
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={cfg.placeholder}
                className="bg-background border-border font-mono text-sm"
              />
            )}
          </div>

          {(type === "password" || type === "api_key") && (
            <div>
              <Label className="text-xs text-muted-foreground font-mono mb-1 block">URL / Serwis</Label>
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://github.com" className="bg-background border-border font-mono text-sm" />
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground font-mono mb-1 block">Notatki</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Dodatkowe informacje..." className="bg-background border-border font-mono text-sm min-h-[60px] resize-none" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground font-mono mb-1 block">Tagi (oddzielone przecinkami)</Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="praca, produkcja, krypto..." className="bg-background border-border font-mono text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-border">Anuluj</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground">Zapisz</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Vault Item Card ──────────────────────────────────────────────────────────

function VaultItemCard({ item, onEdit, onDelete }: { item: VaultItem; onEdit: () => void; onDelete: () => void }) {
  const [showValue, setShowValue] = useState(false);
  const cfg = TYPE_CONFIG[item.type];
  const Icon = cfg.icon;

  const copyValue = () => {
    navigator.clipboard.writeText(item.value);
    toast.success("Skopiowano do schowka");
    // Auto-clear clipboard after 30s
    setTimeout(() => navigator.clipboard.writeText("").catch(() => {}), 30000);
  };

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-md bg-background flex items-center justify-center shrink-0 border border-border`}>
              <Icon className={`w-4 h-4 ${cfg.color}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-sm font-bold text-foreground truncate">{item.title}</span>
                <Badge className={`text-xs border border-border bg-background text-muted-foreground`}>{cfg.label}</Badge>
              </div>
              {item.username && <div className="text-xs text-muted-foreground font-mono">{item.username}</div>}
              {item.url && <div className="text-xs text-blue-400 font-mono truncate">{item.url}</div>}

              <div className="mt-2 flex items-center gap-2">
                <div className={`font-mono text-xs flex-1 truncate ${showValue ? "text-foreground" : "text-muted-foreground"}`}>
                  {showValue ? item.value : "••••••••••••••••"}
                </div>
                <button onClick={() => setShowValue(!showValue)} className="text-muted-foreground hover:text-foreground shrink-0">
                  {showValue ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button onClick={copyValue} className="text-muted-foreground hover:text-primary shrink-0">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.tags.map(tag => (
                    <Badge key={tag} className="text-xs border border-border bg-background text-muted-foreground">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SecureVault() {
  const [unlocked, setUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [items, setItems] = useState<VaultItem[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editItem, setEditItem] = useState<VaultItem | undefined>();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<VaultItemType | "all">("all");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUnlock = useCallback(async (password: string, isNew: boolean) => {
    setMasterPassword(password);
    if (!isNew) {
      const importData = sessionStorage.getItem("vault_import");
      if (importData) {
        try {
          const vault = await decryptVault(importData, password);
          setItems(vault.items);
          sessionStorage.removeItem("vault_import");
          toast.success(`Vault odszyfrowany — ${vault.items.length} wpisów`);
        } catch {
          toast.error("Błąd deszyfrowania");
          return;
        }
      }
    }
    setUnlocked(true);
    toast.success(isNew ? "Nowy vault utworzony" : "Vault odblokowany");
  }, []);

  const handleLock = () => {
    setUnlocked(false);
    setMasterPassword("");
    setItems([]);
    toast.info("Vault zablokowany — klucz usunięty z pamięci");
  };

  const handleAddItem = (data: Omit<VaultItem, "id" | "createdAt" | "updatedAt">) => {
    const now = Date.now();
    const newItem: VaultItem = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    setItems(prev => [newItem, ...prev]);
    toast.success("Wpis dodany do vault");
  };

  const handleEditItem = (data: Omit<VaultItem, "id" | "createdAt" | "updatedAt">) => {
    if (!editItem) return;
    setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, ...data, updatedAt: Date.now() } : i));
    setEditItem(undefined);
    toast.success("Wpis zaktualizowany");
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success("Wpis usunięty");
  };

  const handleExport = async () => {
    if (!masterPassword) return;
    setSaving(true);
    try {
      const vault: VaultData = { version: 1, items, createdAt: Date.now() };
      const encrypted = await encryptVault(vault, masterPassword);
      const blob = new Blob([encrypted], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `secure-vault-${new Date().toISOString().split("T")[0]}.vault`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Vault wyeksportowany i zaszyfrowany");
    } catch {
      toast.error("Błąd eksportu vault");
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.username?.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchType = filterType === "all" || item.type === filterType;
    return matchSearch && matchType;
  });

  if (!unlocked) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground font-mono flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Secure Vault
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Zaszyfrowany sejf na hasła, klucze API, seed phrases i certyfikaty — zero-knowledge, client-side only
          </p>
        </div>
        <UnlockScreen onUnlock={handleUnlock} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Secure Vault
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {items.length} wpisów · AES-256-GCM · Klucz tylko w RAM
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={saving} className="border-border">
            {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Eksportuj .vault
          </Button>
          <Button variant="outline" size="sm" onClick={handleLock} className="border-red-500/50 text-red-400 hover:bg-red-500/10">
            <Lock className="w-4 h-4 mr-2" /> Zablokuj
          </Button>
        </div>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
        <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
        <p className="text-xs text-green-400 font-mono">
          Vault odblokowany. Klucz AES-256 istnieje tylko w pamięci RAM tej sesji — nie jest przechowywany na serwerze ani w localStorage. Schowek jest automatycznie czyszczony po 30 sekundach od skopiowania.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {(Object.entries(TYPE_CONFIG) as [VaultItemType, typeof TYPE_CONFIG[VaultItemType]][]).map(([type, cfg]) => {
          const count = items.filter(i => i.type === type).length;
          const Icon = cfg.icon;
          return (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? "all" : type)}
              className={`p-3 rounded-md border text-center transition-colors ${filterType === type ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}
            >
              <Icon className={`w-5 h-5 mx-auto mb-1 ${cfg.color}`} />
              <div className="text-lg font-bold font-mono text-foreground">{count}</div>
              <div className="text-xs text-muted-foreground">{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Szukaj w vault..." className="pl-9 bg-background border-border font-mono text-sm" />
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-primary text-primary-foreground shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Dodaj wpis
        </Button>
      </div>

      {/* Items */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-mono">
            {items.length === 0 ? "Vault jest pusty — dodaj pierwszy wpis" : "Brak wyników dla podanych filtrów"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map(item => (
            <VaultItemCard
              key={item.id}
              item={item}
              onEdit={() => setEditItem(item)}
              onDelete={() => handleDeleteItem(item.id)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <ItemDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} onSave={handleAddItem} />
      {editItem && (
        <ItemDialog open={true} onClose={() => setEditItem(undefined)} onSave={handleEditItem} initial={editItem} />
      )}
    </div>
  );
}
