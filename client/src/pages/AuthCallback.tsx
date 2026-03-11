import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";

let supabaseClient: ReturnType<typeof createClient> | null = null;

async function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  const res = await fetch("/api/auth/supabase-config");
  if (!res.ok) throw new Error("Supabase config unavailable");
  const { url, anonKey } = await res.json();
  supabaseClient = createClient(url, anonKey);
  return supabaseClient;
}

export default function AuthCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const exchangeToken = trpc.auth.exchangeSupabaseToken.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setStatus("success");
      setTimeout(() => setLocation("/"), 800);
    },
    onError: (err) => {
      setErrorMsg(err.message ?? "Authentication failed");
      setStatus("error");
      setTimeout(() => setLocation("/login"), 3000);
    },
  });

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = await getSupabaseClient();
        // Get session from URL hash (magic link sets #access_token=...)
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          // Try exchanging code from URL params
          const params = new URLSearchParams(window.location.search);
          const code = params.get("code");
          if (code) {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError || !data.session) {
              throw new Error(exchangeError?.message ?? "Failed to exchange code");
            }
          } else {
            throw new Error(error?.message ?? "No session found");
          }
        }
        // Get the final session
        const { data: { session: finalSession } } = await supabase.auth.getSession();
        if (!finalSession) throw new Error("Session not established");
        await exchangeToken.mutateAsync({
          accessToken: finalSession.access_token,
          refreshToken: finalSession.refresh_token ?? "",
        });
      } catch (err: any) {
        console.error("[AuthCallback]", err);
        setErrorMsg(err.message ?? "Authentication failed");
        setStatus("error");
        setTimeout(() => setLocation("/login"), 3000);
      }
    };
    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-sm mx-auto">
        <div className="flex items-center justify-center gap-3">
          <ShieldAlert className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground font-mono tracking-wide">CYBER BUNKER</h1>

        {status === "loading" && (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground font-mono">WERYFIKACJA TOŻSAMOŚCI…</p>
          </div>
        )}
        {status === "success" && (
          <div className="space-y-3">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />
            <p className="text-sm text-muted-foreground font-mono">AUTORYZACJA ZAKOŃCZONA POMYŚLNIE</p>
          </div>
        )}
        {status === "error" && (
          <div className="space-y-3">
            <XCircle className="w-8 h-8 text-destructive mx-auto" />
            <p className="text-sm text-foreground font-medium font-mono">BŁĄD AUTORYZACJI</p>
            <p className="text-xs text-muted-foreground">{errorMsg}</p>
            <p className="text-xs text-muted-foreground font-mono">Przekierowanie do logowania…</p>
          </div>
        )}
      </div>
    </div>
  );
}
