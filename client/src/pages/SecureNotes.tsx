import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Edit, Lock, Tag, Search, Eye, EyeOff, Copy } from "lucide-react";
import { useState, useMemo } from "react";

export default function SecureNotes() {
  const utils = trpc.useUtils();
  const { data: notes = [], isLoading } = trpc.notes.list.useQuery();
  const createMutation = trpc.notes.create.useMutation({
    onSuccess: () => { utils.notes.list.invalidate(); toast.success("Notatka zapisana"); setAddOpen(false); setForm({ title: "", content: "", tags: "" }); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.notes.update.useMutation({
    onSuccess: () => { utils.notes.list.invalidate(); toast.success("Notatka zaktualizowana"); setEditNote(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.notes.delete.useMutation({
    onSuccess: () => { utils.notes.list.invalidate(); toast.success("Notatka usunięta"); },
    onError: (e) => toast.error(e.message),
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editNote, setEditNote] = useState<typeof notes[0] | null>(null);
  const [selectedNote, setSelectedNote] = useState<typeof notes[0] | null>(null);
  const [form, setForm] = useState({ title: "", content: "", tags: "" });
  const [editForm, setEditForm] = useState({ title: "", content: "", tags: "" });
  const [search, setSearch] = useState("");
  const [showContent, setShowContent] = useState<Record<number, boolean>>({});

  const filtered = useMemo(() =>
    notes.filter(n =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      (n.tags || "").toLowerCase().includes(search.toLowerCase())
    ), [notes, search]);

  function openEdit(note: typeof notes[0]) {
    setEditNote(note);
    setEditForm({ title: note.title, content: note.content || "", tags: note.tags || "" });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("Skopiowano do schowka")).catch(() => toast.error("Błąd kopiowania"));
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground tracking-wide">SECURE NOTES</h1>
          <p className="text-sm text-muted-foreground mt-1">Zaszyfrowane notatki operacyjne</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <Lock className="w-3 h-3 text-yellow-400" />
            <span className="text-xs font-mono text-yellow-400">SZYFROWANE LOKALNIE</span>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 font-mono text-xs"><Plus className="w-4 h-4" />Nowa Notatka</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader><DialogTitle className="font-mono">NOWA NOTATKA</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">TYTUŁ</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Tytuł notatki..." className="mt-1 bg-input font-mono" />
                </div>
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">TREŚĆ</Label>
                  <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Treść notatki..." className="mt-1 bg-input font-mono min-h-[120px] resize-y" />
                </div>
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">TAGI (oddzielone przecinkami)</Label>
                  <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="np. klucze, hasła, protokoły" className="mt-1 bg-input font-mono" />
                </div>
                <Button onClick={() => createMutation.mutate(form)} disabled={!form.title || createMutation.isPending} className="w-full font-mono">
                  {createMutation.isPending ? "Zapisywanie..." : "Zapisz Notatkę"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Security notice */}
      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Lock className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-mono text-yellow-400 font-semibold">UWAGA BEZPIECZEŃSTWA</p>
            <p className="text-xs text-muted-foreground mt-1">
              Notatki są przechowywane w bazie danych. Nie przechowuj tutaj kluczy prywatnych ani haseł w formie jawnej — używaj menedżera haseł (KeePassXC). Te notatki służą do dokumentacji procedur i protokołów operacyjnych.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Szukaj notatek i tagów..."
          className="pl-9 bg-input font-mono"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-mono text-foreground">{notes.length}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">ŁĄCZNIE</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-mono text-primary">{filtered.length}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">WYNIKI</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold font-mono text-yellow-400">
            {Array.from(new Set(notes.flatMap(n => (n.tags || "").split(",").map(t => t.trim()).filter(Boolean)))).length}
          </p>
          <p className="text-xs text-muted-foreground font-mono mt-1">UNIKALNE TAGI</p>
        </div>
      </div>

      {/* Notes grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground font-mono text-sm">Ładowanie notatek...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto opacity-30" />
          <p className="text-muted-foreground font-mono text-sm">
            {search ? "Brak wyników dla podanego wyszukiwania" : "Brak notatek. Utwórz pierwszą notatkę."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(note => {
            const visible = showContent[note.id];
            const tags = (note.tags || "").split(",").map(t => t.trim()).filter(Boolean);
            return (
              <div key={note.id} className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <h3 className="font-mono text-sm font-semibold text-foreground truncate">{note.title}</h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setShowContent(s => ({ ...s, [note.id]: !s[note.id] }))}
                      className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                      title={visible ? "Ukryj treść" : "Pokaż treść"}
                    >
                      {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    {note.content && (
                      <button
                        onClick={() => copyToClipboard(note.content || "")}
                        className="p-1 text-muted-foreground hover:text-primary rounded transition-colors"
                        title="Kopiuj treść"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(note)}
                      className="p-1 text-muted-foreground hover:text-primary rounded transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { if (confirm("Usunąć notatkę?")) deleteMutation.mutate({ id: note.id }); }}
                      className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                {note.content && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    {visible ? (
                      <p className="text-xs font-mono text-foreground whitespace-pre-wrap break-words">{note.content}</p>
                    ) : (
                      <p className="text-xs font-mono text-muted-foreground">{'•'.repeat(Math.min(note.content.length, 40))}</p>
                    )}
                  </div>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-xs font-mono text-primary">
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Date */}
                <p className="text-xs text-muted-foreground font-mono">
                  {new Date(note.createdAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editNote} onOpenChange={open => !open && setEditNote(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle className="font-mono">EDYTUJ NOTATKĘ</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-mono text-muted-foreground">TYTUŁ</Label>
              <Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className="mt-1 bg-input font-mono" />
            </div>
            <div>
              <Label className="text-xs font-mono text-muted-foreground">TREŚĆ</Label>
              <Textarea value={editForm.content} onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))} className="mt-1 bg-input font-mono min-h-[120px] resize-y" />
            </div>
            <div>
              <Label className="text-xs font-mono text-muted-foreground">TAGI</Label>
              <Input value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} className="mt-1 bg-input font-mono" />
            </div>
            <Button
              onClick={() => editNote && updateMutation.mutate({ id: editNote.id, ...editForm })}
              disabled={!editForm.title || updateMutation.isPending}
              className="w-full font-mono"
            >
              {updateMutation.isPending ? "Zapisywanie..." : "Zapisz Zmiany"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
