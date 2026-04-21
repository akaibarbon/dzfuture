import { useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, Loader2, Sparkles, ScanLine, X, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { Navigate } from "react-router-dom";

interface GradedItem {
  fileUrl: string;
  studentName?: string;
  score?: string;
  feedback: string;
  strengths: string;
  weaknesses: string;
}

export default function AutoGraderPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [subject, setSubject] = useState("");
  const [rubric, setRubric] = useState("");
  const [maxScore, setMaxScore] = useState("20");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [results, setResults] = useState<GradedItem[]>([]);
  const [grading, setGrading] = useState(false);

  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== "tutor") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ScanLine className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">صفحة خاصة بالأساتذة</h1>
        <p className="text-muted-foreground">هذه الميزة متاحة فقط للحسابات ذات رتبة "أستاذ".</p>
      </div>
    );
  }

  const onPick = (selected: FileList | null) => {
    if (!selected) return;
    const arr = Array.from(selected).slice(0, 30);
    setFiles(arr);
    Promise.all(
      arr.map(
        (f) =>
          new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.readAsDataURL(f);
          })
      )
    ).then(setPreviews);
  };

  const removeAt = (i: number) => {
    setFiles((p) => p.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  };

  const uploadOne = async (f: File): Promise<string | null> => {
    const path = `${user.id}/grading/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage.from("ai-files").upload(path, f, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("ai-files").getPublicUrl(path);
    return data.publicUrl;
  };

  const gradeAll = async () => {
    if (!files.length) {
      toast({ title: "أضف صوراً للفروض", variant: "destructive" });
      return;
    }
    if (!rubric.trim()) {
      toast({ title: "أضف معايير التصحيح (Rubric)", description: "اشرح كيف يجب التصحيح", variant: "destructive" });
      return;
    }
    setGrading(true);
    setResults([]);
    const out: GradedItem[] = [];

    for (const f of files) {
      const url = await uploadOne(f);
      if (!url) {
        toast({ title: `فشل رفع ${f.name}`, variant: "destructive" });
        continue;
      }
      try {
        const { data, error } = await supabase.functions.invoke("ai-chat", {
          body: {
            messages: [
              {
                role: "user",
                content: `أنت أستاذ مصحّح خبير. صحّح ورقة الطالب التالية في مادة "${subject || "غير محدد"}". معايير التصحيح: ${rubric}. النقطة القصوى: ${maxScore}.\n\nأرجع JSON فقط بهذا الشكل بدون أي شرح:\n{"studentName":"اسم الطالب إن ظهر أو فارغ","score":"X/${maxScore}","feedback":"تقييم عام","strengths":"نقاط القوة","weaknesses":"نقاط الضعف والأخطاء"}`,
                file_url: url,
                file_type: f.type,
              },
            ],
          },
        });
        if (error) throw error;
        const txt = data?.content || data?.result || "";
        const match = txt.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          out.push({ fileUrl: url, ...parsed });
        } else {
          out.push({ fileUrl: url, feedback: txt, strengths: "", weaknesses: "" });
        }
        setResults([...out]);
      } catch (e: any) {
        out.push({ fileUrl: url, feedback: `خطأ: ${e?.message || "تعذر التصحيح"}`, strengths: "", weaknesses: "" });
        setResults([...out]);
      }
    }

    setGrading(false);
    toast({ title: "✓ اكتمل التصحيح", description: `${out.length} ورقة` });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
      <header className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
          <ScanLine className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-glow">المصحّح الآلي</h1>
          <p className="text-muted-foreground text-sm">صوّر الفروض الورقية واترك الذكاء الاصطناعي يصححها لك في ثوانٍ.</p>
        </div>
      </header>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-lg">إعدادات التصحيح</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>المادة</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="مثلاً: الرياضيات" />
            </div>
            <div>
              <Label>النقطة القصوى</Label>
              <Input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>معايير التصحيح (Rubric)</Label>
            <Textarea
              rows={4}
              value={rubric}
              onChange={(e) => setRubric(e.target.value)}
              placeholder="اشرح للمصحّح كيف يقيّم: مثلاً 'السؤال 1: 5 نقاط، يجب إيجاد الجذور... السؤال 2: 8 نقاط...' أو 'صحّح حسب الإجابة النموذجية...'"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => cameraRef.current?.click()} variant="outline" className="gap-2">
              <Camera className="w-4 h-4" /> التقط صورة
            </Button>
            <Button onClick={() => fileRef.current?.click()} variant="outline" className="gap-2">
              <Upload className="w-4 h-4" /> ارفع صور/PDF
            </Button>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden multiple onChange={(e) => onPick(e.target.files)} />
            <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden multiple onChange={(e) => onPick(e.target.files)} />
          </div>

          {previews.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2 pt-2">
              {previews.map((p, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                  {files[i]?.type.startsWith("image") ? (
                    <img src={p} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary"><FileText className="w-8 h-8" /></div>
                  )}
                  <button onClick={() => removeAt(i)} className="absolute top-1 left-1 p-1 bg-destructive/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button onClick={gradeAll} disabled={grading || !files.length} className="w-full h-12 bg-primary text-primary-foreground font-bold gap-2">
            {grading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {grading ? `جارٍ تصحيح ${results.length + 1}/${files.length}...` : `صحّح ${files.length || ""} ورقة`}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">النتائج ({results.length})</h2>
          {results.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="overflow-hidden">
                <div className="grid md:grid-cols-[140px_1fr]">
                  <div className="bg-secondary/30 flex items-center justify-center p-2">
                    <img src={r.fileUrl} alt="" className="max-h-32 object-contain rounded" />
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="font-bold">{r.studentName || `ورقة #${i + 1}`}</h3>
                      {r.score && <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground font-mono font-bold">{r.score}</span>}
                    </div>
                    {r.feedback && <p className="text-sm"><span className="font-semibold">📝 التقييم:</span> {r.feedback}</p>}
                    {r.strengths && <p className="text-sm text-green-600 dark:text-green-400"><span className="font-semibold">✓ نقاط القوة:</span> {r.strengths}</p>}
                    {r.weaknesses && <p className="text-sm text-orange-600 dark:text-orange-400"><span className="font-semibold">⚠ نقاط الضعف:</span> {r.weaknesses}</p>}
                  </CardContent>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
