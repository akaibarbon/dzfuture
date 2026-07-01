import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TEACHERS, ALL_SECTIONS, sectionsForTeacher, getTeacher, type TeacherSectionKey } from "@/lib/teachers";
import { Plus, Trash2, Upload, ShieldAlert, GraduationCap, Loader2 } from "lucide-react";

interface ContentRow {
  id: string;
  teacher_id: string;
  section_key: string;
  kind: string;
  title: string;
  description: string | null;
  url: string | null;
  created_by: string | null;
  created_at: string;
}

type Kind = "model3d" | "image" | "video" | "link" | "file" | "text";

const KIND_LABELS: Record<Kind, string> = {
  model3d: "نموذج 3D",
  image: "صورة",
  video: "فيديو",
  link: "رابط",
  file: "ملف",
  text: "نص",
};

export default function MyClassroomPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isApprovedTutor = user?.role === "tutor" && user?.approved !== false;
  const isSuperAdmin = user?.role === "admin";

  // Match the logged-in tutor to a specific teacher entry by name tokens.
  // Each tutor can ONLY edit their own section — no dropdown.
  // Admins keep full access to every teacher via the selector.
  const myTeacher = useMemo(() => {
    if (!user?.fullName) return null;
    const norm = (s: string) =>
      s.replace(/[أإآا]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase();
    const userTokens = norm(user.fullName)
      .replace(/^(الاستاذ(ه)?|الأستاذ(ة)?)\s+/g, "")
      .split(/\s+/)
      .filter((t) => t.length >= 2);
    return (
      TEACHERS.find((t) => {
        const teacherTokens = norm(t.name)
          .replace(/^(الاستاذ(ه)?|الأستاذ(ة)?)\s+/g, "")
          .split(/\s+/)
          .filter((x) => x.length >= 2);
        return teacherTokens.some((tt) => userTokens.some((ut) => ut === tt));
      }) || null
    );
  }, [user?.fullName]);

  const [teacherId, setTeacherId] = useState<string>(
    myTeacher?.id || (isSuperAdmin ? TEACHERS[0].id : ""),
  );
  useEffect(() => {
    if (myTeacher && teacherId !== myTeacher.id && !isSuperAdmin) {
      setTeacherId(myTeacher.id);
    }
  }, [myTeacher?.id, isSuperAdmin]);

  const teacher = getTeacher(teacherId);
  const sections = teacher ? sectionsForTeacher(teacher) : [];

  const [sectionKey, setSectionKey] = useState<TeacherSectionKey>(sections[0]?.key ?? "resources");
  useEffect(() => {
    if (teacher) setSectionKey(sectionsForTeacher(teacher)[0].key);
  }, [teacherId]);

  const [items, setItems] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<{ kind: Kind; title: string; description: string; url: string }>({
    kind: "link", title: "", description: "", url: "",
  });
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("teacher_content")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("section_key", sectionKey)
      .order("created_at", { ascending: false });
    setItems((data as ContentRow[]) || []);
    setLoading(false);
  };
  useEffect(() => { if (isApprovedTutor || isSuperAdmin) load(); }, [teacherId, sectionKey, isApprovedTutor, isSuperAdmin]);

  const handleFileUpload = async (file: File) => {
    if (!user?.id) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("lessons").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data } = await supabase.storage.from("lessons").createSignedUrl(path, 60 * 60 * 24 * 365);
      setForm((f) => ({ ...f, url: data?.signedUrl ?? "", title: f.title || file.name }));
      toast({ title: "تم رفع الملف", description: "اضغط إضافة لحفظ المحتوى." });
    } catch (e: any) {
      toast({ title: "فشل الرفع", description: e?.message || "", variant: "destructive" });
    }
    setUploading(false);
  };

  const handleAdd = async () => {
    if (!user?.id || !form.title.trim()) return;
    const payload = {
      teacher_id: teacherId,
      section_key: sectionKey,
      kind: form.kind,
      title: form.title.trim(),
      description: form.description.trim() || null,
      url: form.url.trim() || null,
      created_by: user.id,
    };
    const { error } = await supabase.from("teacher_content").insert(payload as any);
    if (error) { toast({ title: "تعذر الحفظ", description: error.message, variant: "destructive" }); return; }
    setForm({ kind: "link", title: "", description: "", url: "" });
    toast({ title: "✓ تمت الإضافة" });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا العنصر؟")) return;
    const { error } = await supabase.from("teacher_content").delete().eq("id", id);
    if (error) { toast({ title: "تعذر الحذف", description: error.message, variant: "destructive" }); return; }
    load();
  };

  if (!isApprovedTutor && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="rounded-2xl border border-border bg-card max-w-md w-full text-center p-8 shadow-[0_10px_30px_-12px_hsl(24_25%_16%/0.15)]">
          <ShieldAlert className="w-14 h-14 mx-auto text-destructive mb-3" />
          <h2 className="text-2xl font-display mb-2">صفحة مخصصة للأساتذة</h2>
          <p className="text-muted-foreground text-sm">تواصل مع الإدارة لاعتماد حسابك كأستاذ.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-2xl border border-border bg-[hsl(28_45%_88%)] p-6 md:p-8 shadow-[0_10px_30px_-12px_hsl(24_25%_16%/0.18)]">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap className="w-6 h-6" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">إدارة قسمي</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl">قسمي</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          خصّص الصفحات الظاهرة في "قسم أستاذي" — ارفع النماذج، الصور، الفيديوهات والروابط لكل قسم من أقسام مادتك.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 grid md:grid-cols-2 gap-4">
        <div>
          <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">الأستاذ</Label>
          <Select value={teacherId} onValueChange={setTeacherId}>
            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TEACHERS.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name} — {t.subject}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">القسم</Label>
          <Select value={sectionKey} onValueChange={(v) => setSectionKey(v as TeacherSectionKey)}>
            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {sections.map((s) => (
                <SelectItem key={s.key} value={s.key}>{s.emoji} {s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Add form */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h3 className="font-display text-2xl">إضافة محتوى جديد</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">النوع</Label>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as Kind })}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
                  <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">العنوان</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: تجربة الخلية" className="bg-background" />
          </div>
        </div>
        <div>
          <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">الوصف (اختياري)</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="bg-background" />
        </div>
        <div>
          <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">الرابط / URL</Label>
          <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" className="bg-background" />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-border bg-secondary hover:bg-secondary/70 px-4 py-2 text-sm font-medium">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            رفع ملف
            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
          </label>
          <Button onClick={handleAdd} disabled={!form.title.trim()} className="gap-2">
            <Plus className="w-4 h-4" /> إضافة
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display text-2xl mb-4">المحتوى الحالي ({items.length})</h3>
        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-8">جاري التحميل…</div>
        ) : items.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">لا يوجد محتوى بعد في هذا القسم.</div>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="rounded-full bg-secondary px-2 py-0.5">{KIND_LABELS[it.kind as Kind] || it.kind}</span>
                  </div>
                  <div className="font-medium truncate">{it.title}</div>
                  {it.description && <div className="text-sm text-muted-foreground mt-0.5">{it.description}</div>}
                  {it.url && <a href={it.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline truncate block mt-1">{it.url}</a>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(it.id)} className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
