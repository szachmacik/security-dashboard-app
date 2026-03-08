import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Lock, Unlock, Key, RefreshCw, Copy, Eye, EyeOff,
  Shield, AlertTriangle, CheckCircle, Info, Download, Upload
} from "lucide-react";

// ─── Web Crypto Helpers ───────────────────────────────────────────────────────

const crypto = window.crypto;

function buf2hex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function hex2buf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function buf2b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function b642buf(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

// AES-256-GCM
async function aesEncrypt(plaintext: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  // Format: salt(16) + iv(12) + ciphertext
  const result = new Uint8Array(16 + 12 + ciphertext.byteLength);
  result.set(salt, 0);
  result.set(iv, 16);
  result.set(new Uint8Array(ciphertext), 28);
  return buf2b64(result.buffer);
}

async function aesDecrypt(ciphertextB64: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const data = b642buf(ciphertextB64);
  const salt = data.slice(0, 16);
  const iv = data.slice(16, 28);
  const ciphertext = data.slice(28);
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return dec.decode(plaintext);
}

// RSA-OAEP
async function rsaGenerateKeyPair(bits: 2048 | 4096): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: bits, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"]
  );
  const pubDer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privDer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const pubPem = `-----BEGIN PUBLIC KEY-----\n${buf2b64(pubDer).match(/.{1,64}/g)!.join("\n")}\n-----END PUBLIC KEY-----`;
  const privPem = `-----BEGIN PRIVATE KEY-----\n${buf2b64(privDer).match(/.{1,64}/g)!.join("\n")}\n-----END PRIVATE KEY-----`;
  return { publicKey: pubPem, privateKey: privPem };
}

async function rsaEncrypt(plaintext: string, publicKeyPem: string): Promise<string> {
  const b64 = publicKeyPem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const der = b642buf(b64).buffer as ArrayBuffer;
  const key = await crypto.subtle.importKey("spki", der, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, enc.encode(plaintext));
  return buf2b64(ciphertext);
}

async function rsaDecrypt(ciphertextB64: string, privateKeyPem: string): Promise<string> {
  const b64 = privateKeyPem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const der = b642buf(b64).buffer as ArrayBuffer;
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, key, b642buf(ciphertextB64).buffer as ArrayBuffer);
  return new TextDecoder().decode(plaintext);
}

// SHA hash
async function computeHash(text: string, algo: "SHA-256" | "SHA-384" | "SHA-512"): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest(algo, data);
  return buf2hex(hash);
}

// ─── AES Tab ─────────────────────────────────────────────────────────────────

function AESTab() {
  const [mode, setMode] = useState<"encrypt" | "decrypt">("encrypt");
  const [input, setInput] = useState("");
  const [password, setPassword] = useState("");
  const [output, setOutput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleProcess = async () => {
    if (!input.trim()) { toast.error("Podaj tekst do przetworzenia"); return; }
    if (!password) { toast.error("Podaj hasło"); return; }
    setLoading(true);
    try {
      if (mode === "encrypt") {
        const result = await aesEncrypt(input, password);
        setOutput(result);
        toast.success("Zaszyfrowano pomyślnie");
      } else {
        const result = await aesDecrypt(input.trim(), password);
        setOutput(result);
        toast.success("Odszyfrowano pomyślnie");
      }
    } catch {
      toast.error(mode === "decrypt" ? "Błąd deszyfrowania — złe hasło lub uszkodzone dane" : "Błąd szyfrowania");
      setOutput("");
    } finally {
      setLoading(false);
    }
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    toast.success("Skopiowano do schowka");
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    const arr = crypto.getRandomValues(new Uint8Array(24));
    setPassword(Array.from(arr).map(b => chars[b % chars.length]).join(""));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-400 font-mono">
          <strong>AES-256-GCM</strong> z PBKDF2 (310 000 iteracji, SHA-256). Szyfrowanie odbywa się w całości w przeglądarce — żadne dane nie są wysyłane na serwer.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode("encrypt"); setInput(""); setOutput(""); }}
          className={`flex-1 py-2 text-xs font-mono rounded-md border transition-colors flex items-center justify-center gap-2 ${mode === "encrypt" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
        >
          <Lock className="w-3.5 h-3.5" /> Szyfruj
        </button>
        <button
          onClick={() => { setMode("decrypt"); setInput(""); setOutput(""); }}
          className={`flex-1 py-2 text-xs font-mono rounded-md border transition-colors flex items-center justify-center gap-2 ${mode === "decrypt" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
        >
          <Unlock className="w-3.5 h-3.5" /> Deszyfruj
        </button>
      </div>

      {/* Password */}
      <div>
        <Label className="text-xs text-muted-foreground font-mono mb-1 block">Hasło szyfrowania</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Silne hasło (min. 12 znaków)"
              className="bg-background border-border font-mono text-sm pr-8"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={generatePassword} className="border-border shrink-0">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Generuj
          </Button>
        </div>
        {password && (
          <div className="mt-1 flex gap-1">
            {[
              { label: "Długość", ok: password.length >= 12 },
              { label: "Wielkie litery", ok: /[A-Z]/.test(password) },
              { label: "Cyfry", ok: /[0-9]/.test(password) },
              { label: "Znaki specjalne", ok: /[^a-zA-Z0-9]/.test(password) },
            ].map(c => (
              <span key={c.label} className={`text-xs font-mono px-1.5 py-0.5 rounded border ${c.ok ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
                {c.ok ? "✓" : "✗"} {c.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div>
        <Label className="text-xs text-muted-foreground font-mono mb-1 block">
          {mode === "encrypt" ? "Tekst jawny" : "Zaszyfrowany tekst (Base64)"}
        </Label>
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={mode === "encrypt" ? "Wpisz tekst do zaszyfrowania..." : "Wklej zaszyfrowany tekst Base64..."}
          className="bg-background border-border font-mono text-sm min-h-[100px] resize-none"
        />
      </div>

      <Button onClick={handleProcess} disabled={loading} className="w-full bg-primary text-primary-foreground">
        {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : mode === "encrypt" ? <Lock className="w-4 h-4 mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
        {loading ? "Przetwarzam..." : mode === "encrypt" ? "Zaszyfruj AES-256-GCM" : "Odszyfruj"}
      </Button>

      {/* Output */}
      {output && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs text-muted-foreground font-mono">
              {mode === "encrypt" ? "Zaszyfrowany tekst (Base64)" : "Tekst jawny"}
            </Label>
            <Button variant="ghost" size="sm" onClick={copyOutput} className="h-6 px-2 text-xs">
              <Copy className="w-3 h-3 mr-1" /> Kopiuj
            </Button>
          </div>
          <Textarea
            value={output}
            readOnly
            className="bg-background border-border font-mono text-xs min-h-[80px] resize-none text-green-400"
          />
        </div>
      )}
    </div>
  );
}

// ─── RSA Tab ──────────────────────────────────────────────────────────────────

function RSATab() {
  const [keyBits, setKeyBits] = useState<"2048" | "4096">("2048");
  const [publicKey, setPublicKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [plaintext, setPlaintext] = useState("");
  const [ciphertext, setCiphertext] = useState("");
  const [decrypted, setDecrypted] = useState("");
  const [generating, setGenerating] = useState(false);
  const [encrypting, setEncrypting] = useState(false);
  const [decrypting, setDecrypting] = useState(false);

  const generateKeys = async () => {
    setGenerating(true);
    try {
      const { publicKey: pub, privateKey: priv } = await rsaGenerateKeyPair(Number(keyBits) as 2048 | 4096);
      setPublicKey(pub);
      setPrivateKey(priv);
      toast.success(`Para kluczy RSA-${keyBits} wygenerowana`);
    } catch {
      toast.error("Błąd generowania kluczy");
    } finally {
      setGenerating(false);
    }
  };

  const handleEncrypt = async () => {
    if (!plaintext.trim() || !publicKey) { toast.error("Podaj tekst i klucz publiczny"); return; }
    if (plaintext.length > 200) { toast.error("RSA może szyfrować maks. ~200 znaków. Użyj AES dla dłuższych danych."); return; }
    setEncrypting(true);
    try {
      const result = await rsaEncrypt(plaintext, publicKey);
      setCiphertext(result);
      toast.success("Zaszyfrowano RSA-OAEP");
    } catch {
      toast.error("Błąd szyfrowania RSA");
    } finally {
      setEncrypting(false);
    }
  };

  const handleDecrypt = async () => {
    if (!ciphertext.trim() || !privateKey) { toast.error("Podaj zaszyfrowany tekst i klucz prywatny"); return; }
    setDecrypting(true);
    try {
      const result = await rsaDecrypt(ciphertext, privateKey);
      setDecrypted(result);
      toast.success("Odszyfrowano RSA-OAEP");
    } catch {
      toast.error("Błąd deszyfrowania — zły klucz prywatny?");
    } finally {
      setDecrypting(false);
    }
  };

  const downloadKey = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-400 font-mono">
          <strong>RSA-OAEP</strong> z SHA-256. Klucze generowane lokalnie w przeglądarce (Web Crypto API). RSA szyfruje maks. ~200 znaków — do dłuższych danych użyj AES (hybrid encryption).
        </p>
      </div>

      {/* Key generation */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Generowanie Kluczy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 items-center">
            <Select value={keyBits} onValueChange={v => setKeyBits(v as "2048" | "4096")}>
              <SelectTrigger className="bg-background border-border font-mono text-sm w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="2048" className="font-mono text-sm">RSA-2048 (szybki)</SelectItem>
                <SelectItem value="4096" className="font-mono text-sm">RSA-4096 (bezpieczny)</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generateKeys} disabled={generating} className="bg-primary text-primary-foreground">
              {generating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Key className="w-4 h-4 mr-2" />}
              {generating ? (keyBits === "4096" ? "Generuję (~10s)..." : "Generuję...") : "Generuj parę kluczy"}
            </Button>
          </div>

          {publicKey && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs text-muted-foreground font-mono">Klucz Publiczny (udostępnij)</Label>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { navigator.clipboard.writeText(publicKey); toast.success("Skopiowano klucz publiczny"); }}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => downloadKey(publicKey, "public_key.pem")}>
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <Textarea value={publicKey} readOnly className="bg-background border-green-500/30 font-mono text-xs min-h-[120px] resize-none text-green-400" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs text-muted-foreground font-mono">Klucz Prywatny (TAJNY!)</Label>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { navigator.clipboard.writeText(privateKey); toast.success("Skopiowano klucz prywatny"); }}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => downloadKey(privateKey, "private_key.pem")}>
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <Textarea value={privateKey} readOnly className="bg-background border-red-500/30 font-mono text-xs min-h-[120px] resize-none text-red-400" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Encrypt */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Szyfrowanie (klucz publiczny)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground font-mono mb-1 block">Klucz publiczny (PEM)</Label>
            <Textarea value={publicKey} onChange={e => setPublicKey(e.target.value)} placeholder="-----BEGIN PUBLIC KEY-----..." className="bg-background border-border font-mono text-xs min-h-[80px] resize-none" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground font-mono mb-1 block">Tekst jawny (maks. ~200 znaków)</Label>
            <Textarea value={plaintext} onChange={e => setPlaintext(e.target.value)} placeholder="Tekst do zaszyfrowania..." className="bg-background border-border font-mono text-sm min-h-[60px] resize-none" />
            <div className="text-xs text-muted-foreground font-mono mt-1">{plaintext.length}/200 znaków</div>
          </div>
          <Button onClick={handleEncrypt} disabled={encrypting} size="sm" className="bg-primary text-primary-foreground">
            {encrypting ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Lock className="w-3.5 h-3.5 mr-1" />}
            Zaszyfruj RSA
          </Button>
          {ciphertext && (
            <div>
              <Label className="text-xs text-muted-foreground font-mono mb-1 block">Zaszyfrowany tekst (Base64)</Label>
              <Textarea value={ciphertext} readOnly className="bg-background border-border font-mono text-xs min-h-[60px] resize-none text-green-400" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decrypt */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Deszyfrowanie (klucz prywatny)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground font-mono mb-1 block">Klucz prywatny (PEM)</Label>
            <Textarea value={privateKey} onChange={e => setPrivateKey(e.target.value)} placeholder="-----BEGIN PRIVATE KEY-----..." className="bg-background border-border font-mono text-xs min-h-[80px] resize-none" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground font-mono mb-1 block">Zaszyfrowany tekst (Base64)</Label>
            <Textarea value={ciphertext} onChange={e => setCiphertext(e.target.value)} placeholder="Wklej zaszyfrowany tekst Base64..." className="bg-background border-border font-mono text-xs min-h-[60px] resize-none" />
          </div>
          <Button onClick={handleDecrypt} disabled={decrypting} size="sm" variant="outline" className="border-border">
            {decrypting ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Unlock className="w-3.5 h-3.5 mr-1" />}
            Odszyfruj RSA
          </Button>
          {decrypted && (
            <div>
              <Label className="text-xs text-muted-foreground font-mono mb-1 block">Tekst jawny</Label>
              <Textarea value={decrypted} readOnly className="bg-background border-border font-mono text-sm min-h-[60px] resize-none text-green-400" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Hash Tab ─────────────────────────────────────────────────────────────────

function HashTab() {
  const [input, setInput] = useState("");
  const [algo, setAlgo] = useState<"SHA-256" | "SHA-384" | "SHA-512">("SHA-256");
  const [hash, setHash] = useState("");
  const [compareHash, setCompareHash] = useState("");
  const [loading, setLoading] = useState(false);

  const handleHash = async () => {
    if (!input.trim()) { toast.error("Podaj tekst do hashowania"); return; }
    setLoading(true);
    try {
      const result = await computeHash(input, algo);
      setHash(result);
    } catch {
      toast.error("Błąd hashowania");
    } finally {
      setLoading(false);
    }
  };

  const isMatch = compareHash.trim() !== "" && hash !== "" && compareHash.trim().toLowerCase() === hash.toLowerCase();
  const isMismatch = compareHash.trim() !== "" && hash !== "" && !isMatch;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-400 font-mono">
          Kryptograficzne funkcje skrótu SHA-2. Używaj do weryfikacji integralności plików, haseł (z solą!) i podpisów cyfrowych.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { algo: "SHA-256", bits: 256, use: "Standardowe użycie, TLS, JWT" },
          { algo: "SHA-384", bits: 384, use: "Wyższe bezpieczeństwo, TLS 1.3" },
          { algo: "SHA-512", bits: 512, use: "Maksymalne bezpieczeństwo" },
        ].map(a => (
          <button
            key={a.algo}
            onClick={() => setAlgo(a.algo as typeof algo)}
            className={`p-3 rounded-md border text-left transition-colors ${algo === a.algo ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
          >
            <div className={`text-sm font-bold font-mono ${algo === a.algo ? "text-primary" : "text-foreground"}`}>{a.algo}</div>
            <div className="text-xs text-muted-foreground">{a.bits} bitów</div>
            <div className="text-xs text-muted-foreground mt-0.5">{a.use}</div>
          </button>
        ))}
      </div>

      <div>
        <Label className="text-xs text-muted-foreground font-mono mb-1 block">Tekst wejściowy</Label>
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Wpisz tekst do hashowania..."
          className="bg-background border-border font-mono text-sm min-h-[80px] resize-none"
        />
      </div>

      <Button onClick={handleHash} disabled={loading} className="w-full bg-primary text-primary-foreground">
        {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
        Oblicz {algo}
      </Button>

      {hash && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-muted-foreground font-mono">Hash ({algo})</Label>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { navigator.clipboard.writeText(hash); toast.success("Skopiowano hash"); }}>
                <Copy className="w-3 h-3 mr-1" /> Kopiuj
              </Button>
            </div>
            <div className="p-3 bg-background border border-border rounded-md font-mono text-xs text-green-400 break-all">{hash}</div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground font-mono mb-1 block">Porównaj hash (weryfikacja integralności)</Label>
            <Input
              value={compareHash}
              onChange={e => setCompareHash(e.target.value)}
              placeholder="Wklej hash do porównania..."
              className={`bg-background border-border font-mono text-sm ${isMatch ? "border-green-500" : isMismatch ? "border-red-500" : ""}`}
            />
            {isMatch && (
              <div className="flex items-center gap-2 mt-1 text-xs text-green-400 font-mono">
                <CheckCircle className="w-3.5 h-3.5" /> Hashe są identyczne — integralność potwierdzona
              </div>
            )}
            {isMismatch && (
              <div className="flex items-center gap-2 mt-1 text-xs text-red-400 font-mono">
                <AlertTriangle className="w-3.5 h-3.5" /> Hashe różnią się — dane mogły zostać zmodyfikowane!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Algorithm Comparison ─────────────────────────────────────────────────────

function ComparisonTab() {
  const algorithms = [
    { name: "AES-256-GCM", type: "Symetryczny", keySize: "256 bit", security: "★★★★★", speed: "★★★★★", use: "Szyfrowanie danych, plików, komunikacji", notes: "Uwierzytelnione szyfrowanie (AEAD), standard przemysłowy" },
    { name: "RSA-4096-OAEP", type: "Asymetryczny", keySize: "4096 bit", security: "★★★★★", speed: "★★☆☆☆", use: "Wymiana kluczy, podpisy cyfrowe", notes: "Wolny, maks. ~446 bajtów danych. Używaj do wymiany klucza AES." },
    { name: "RSA-2048-OAEP", type: "Asymetryczny", keySize: "2048 bit", security: "★★★★☆", speed: "★★★☆☆", use: "TLS, certyfikaty, podpisy", notes: "Minimalny standard NIST do 2030. Preferuj 4096 dla nowych systemów." },
    { name: "ChaCha20-Poly1305", type: "Symetryczny", keySize: "256 bit", security: "★★★★★", speed: "★★★★★", use: "TLS 1.3, mobilne, IoT", notes: "Szybszy niż AES na urządzeniach bez akceleracji sprzętowej AES-NI" },
    { name: "SHA-256", type: "Hash", keySize: "256 bit", security: "★★★★☆", speed: "★★★★★", use: "Integralność, JWT, certyfikaty", notes: "Standard TLS/SSL, nie używaj do haseł (użyj bcrypt/Argon2)" },
    { name: "SHA-512", type: "Hash", keySize: "512 bit", security: "★★★★★", speed: "★★★★☆", use: "Wysoka integralność, podpisy", notes: "Szybszy niż SHA-256 na 64-bit CPU, 512-bit output" },
    { name: "PBKDF2-SHA256", type: "KDF", keySize: "zmienny", security: "★★★☆☆", speed: "★★☆☆☆", use: "Hasła → klucze kryptograficzne", notes: "Min. 310 000 iteracji (NIST 2023). Preferuj Argon2id dla haseł." },
    { name: "Argon2id", type: "KDF", keySize: "zmienny", security: "★★★★★", speed: "★★☆☆☆", use: "Haszowanie haseł, klucze", notes: "Zwycięzca Password Hashing Competition 2015. Odporny na GPU/ASIC." },
  ];

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-2 text-muted-foreground">Algorytm</th>
              <th className="text-left p-2 text-muted-foreground">Typ</th>
              <th className="text-left p-2 text-muted-foreground">Klucz</th>
              <th className="text-left p-2 text-muted-foreground">Bezp.</th>
              <th className="text-left p-2 text-muted-foreground">Szybk.</th>
              <th className="text-left p-2 text-muted-foreground">Zastosowanie</th>
            </tr>
          </thead>
          <tbody>
            {algorithms.map((alg, i) => (
              <tr key={alg.name} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-background/30" : ""}`}>
                <td className="p-2 font-bold text-primary">{alg.name}</td>
                <td className="p-2">
                  <Badge className={`text-xs border ${
                    alg.type === "Symetryczny" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                    alg.type === "Asymetryczny" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                    alg.type === "Hash" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                    "bg-green-500/20 text-green-400 border-green-500/30"
                  }`}>{alg.type}</Badge>
                </td>
                <td className="p-2 text-muted-foreground">{alg.keySize}</td>
                <td className="p-2 text-yellow-400">{alg.security}</td>
                <td className="p-2 text-blue-400">{alg.speed}</td>
                <td className="p-2 text-foreground">{alg.use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-2">
          <h3 className="text-sm font-bold font-mono text-primary">Rekomendacje NIST 2024</h3>
          {[
            "Szyfrowanie symetryczne: AES-256-GCM (standard) lub ChaCha20-Poly1305 (mobilne/IoT)",
            "Wymiana kluczy: RSA-4096 lub ECDH-P384 (krótszy klucz, równoważne bezpieczeństwo)",
            "Podpisy cyfrowe: RSA-PSS-4096 lub ECDSA-P384",
            "Haszowanie: SHA-256 minimum, SHA-384/512 dla wysokiego bezpieczeństwa",
            "Hasła: Argon2id (memory=64MB, iterations=3) lub bcrypt (cost=12)",
            "Post-quantum: ML-KEM (Kyber) i ML-DSA (Dilithium) — nowe standardy NIST 2024",
          ].map((rec, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-foreground">
              <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
              <span>{rec}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CipherTools() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono flex items-center gap-2">
            <Lock className="w-6 h-6 text-primary" />
            Cipher Tools
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Szyfrowanie AES-256-GCM, RSA-OAEP i hashowanie SHA-2 — wszystko lokalnie w przeglądarce (Web Crypto API)
          </p>
        </div>
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-mono text-xs">
          CLIENT-SIDE ONLY
        </Badge>
      </div>

      <Tabs defaultValue="aes">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="aes" className="font-mono text-xs">AES-256-GCM</TabsTrigger>
          <TabsTrigger value="rsa" className="font-mono text-xs">RSA-OAEP</TabsTrigger>
          <TabsTrigger value="hash" className="font-mono text-xs">SHA Hash</TabsTrigger>
          <TabsTrigger value="compare" className="font-mono text-xs">Porównanie</TabsTrigger>
        </TabsList>
        <TabsContent value="aes" className="mt-4"><AESTab /></TabsContent>
        <TabsContent value="rsa" className="mt-4"><RSATab /></TabsContent>
        <TabsContent value="hash" className="mt-4"><HashTab /></TabsContent>
        <TabsContent value="compare" className="mt-4"><ComparisonTab /></TabsContent>
      </Tabs>
    </div>
  );
}
