import { useMemo } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { fetchPublicItems, TTItem } from "@/lib/teach-technics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ExternalLink,
  Sparkles,
  PenTool,
  Image as ImageIcon,
  Mic,
  Brain,
  Presentation,
  GraduationCap,
  CheckCircle2,
  ListChecks,
  Tag as TagIcon,
  Share2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { BackToTop } from "@/components/back-to-top";
import { useDocumentMeta } from "@/hooks/use-document-meta";

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  writing: { label: "كتابة", icon: PenTool, color: "text-sky-400" },
  visual: { label: "بصري", icon: ImageIcon, color: "text-fuchsia-400" },
  audio: { label: "صوت", icon: Mic, color: "text-emerald-400" },
  research: { label: "بحث", icon: Brain, color: "text-amber-400" },
  classroom: { label: "قسم", icon: Presentation, color: "text-primary" },
};

function hostOf(url?: string | null) {
  if (!url) return "";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

export default function TeachTechnicsToolPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["teach-technics-public"],
    queryFn: fetchPublicItems,
  });

  const tool = useMemo(() => items.find((i) => i.id === id && i.kind === "tool"), [items, id]);
  const related = useMemo(() => {
    if (!tool) return [] as TTItem[];
    return items
      .filter((i) => i.kind === "tool" && i.id !== tool.id)
      .map((i) => {
        const shared = i.tags.filter((t) => tool.tags.includes(t)).length;
        const sameCat = i.category && i.category === tool.category ? 1 : 0;
        return { item: i, score: shared * 2 + sameCat };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((x) => x.item);
  }, [items, tool]);

  const toolHost = tool?.url ? hostOf(tool.url) : "";
  const shareImage = tool?.logo_url || (toolHost ? `https://logo.clearbit.com/${toolHost}` : undefined);
  useDocumentMeta({
    title: tool ? `${tool.title} — Teach Technics` : "Teach Technics",
    description: tool?.subtitle || tool?.body?.slice(0, 160) || "دليل أدوات وطرق التدريس الحديثة.",
    image: shareImage,
    type: "article",
  });

  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== "tutor" && user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" dir="rtl">
        <GraduationCap className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold">صفحة خاصة بالأساتذة</h1>
      </div>
    );
  }

  if (isLoading) {
    return <div className="py-20 text-center text-muted-foreground" dir="rtl">جاري التحميل...</div>;
  }

  if (!tool) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-4" dir="rtl">
        <h1 className="text-2xl font-bold">لم يتم العثور على الأداة</h1>
        <p className="text-muted-foreground text-sm">قد تكون الأداة محذوفة أو غير منشورة.</p>
        <Button asChild variant="outline">
          <Link to="/teach-technics"><ArrowRight className="w-4 h-4 ms-1" /> العودة إلى Teach Technics</Link>
        </Button>
      </div>
    );
  }

  const host = hostOf(tool.url);
  const catKey = (tool.category && CATEGORY_META[tool.category]) ? tool.category : "writing";
  const meta = CATEGORY_META[catKey!];
  const logo = tool.logo_url || (host ? `https://logo.clearbit.com/${host}` : "");

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("تم نسخ رابط الصفحة");
    } catch {
      toast.error("تعذّر نسخ الرابط");
    }
  };

  const share = async () => {
    const shareData = { title: tool.title, text: tool.subtitle ?? "", url: window.location.href };
    if ((navigator as any).share) {
      try { await (navigator as any).share(shareData); } catch {}
    } else {
      copyLink();
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-28" dir="rtl">
      {/* Back */}
      <div className="flex items-center gap-2 text-sm">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/teach-technics"><ArrowRight className="w-4 h-4" /> Teach Technics</Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground/80 truncate">{tool.title}</span>
      </div>

      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl p-6 md:p-8 border border-primary/30 bg-gradient-to-br from-primary/15 via-background to-background shadow-xl">
        <div className="absolute -top-16 -left-16 w-56 h-56 bg-primary/20 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row gap-5 items-start">
          {logo && (
            <img
              src={logo}
              alt={`${tool.title} logo`}
              className="w-20 h-20 rounded-2xl bg-white/90 p-2 object-contain flex-shrink-0 shadow-md"
              onError={(e) => {
                const el = e.currentTarget;
                if (host && !el.dataset.fb) {
                  el.dataset.fb = "1";
                  el.src = `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
                }
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1.5 mb-2">
              <Badge variant="outline" className={`gap-1 ${meta.color} border-current/30`}>
                <meta.icon className="w-3 h-3" /> {meta.label}
              </Badge>
              {tool.level && <Badge variant="outline" className="text-[10px]">{tool.level}</Badge>}
              {tool.is_free
                ? <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30">مجاني</Badge>
                : <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30">مدفوع</Badge>}
            </div>
            <h1 className="text-2xl md:text-4xl font-bold font-display leading-tight">{tool.title}</h1>
            {tool.subtitle && (
              <p className="text-muted-foreground text-sm md:text-base mt-2 leading-relaxed">{tool.subtitle}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              {tool.url && tool.url !== "#" && (
                <Button asChild className="gap-2">
                  <a href={tool.url} target="_blank" rel="noreferrer">
                    افتح {tool.title} <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-1" onClick={share}>
                <Share2 className="w-3.5 h-3.5" /> مشاركة
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={copyLink}>
                <Copy className="w-3.5 h-3.5" /> نسخ الرابط
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Deep description */}
          {tool.body && (
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> نظرة عامة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{tool.body}</p>
              </CardContent>
            </Card>
          )}

          {/* Features */}
          {tool.features.length > 0 && (
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> أبرز الميزات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {tool.features.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground/85 leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400/80 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* How-to steps */}
          {tool.how_to.length > 0 && (
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-primary" /> خطوات الاستخدام
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {tool.how_to.map((step, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <span className="w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-sm text-foreground/85 leading-relaxed pt-0.5">{step}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Direct links */}
          <Card className="glass-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">روابط مباشرة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tool.url && tool.url !== "#" ? (
                <>
                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition text-sm"
                  >
                    <span className="truncate">الموقع الرسمي</span>
                    <ExternalLink className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  </a>
                  {host && (
                    <>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(tool.title + " tutorial")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition text-sm"
                      >
                        <span>دروس تعليمية</span>
                        <ExternalLink className="w-3.5 h-3.5 text-primary" />
                      </a>
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(tool.title + " شرح")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition text-sm"
                      >
                        <span>فيديوهات YouTube</span>
                        <ExternalLink className="w-3.5 h-3.5 text-primary" />
                      </a>
                      <p className="text-[11px] text-muted-foreground pt-1">{host}</p>
                    </>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">لا يوجد رابط خارجي.</p>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {tool.tags.length > 0 && (
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TagIcon className="w-4 h-4 text-primary" /> وسوم البحث
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {tool.tags.map((tg) => (
                    <Link
                      key={tg}
                      to={`/teach-technics?tag=${encodeURIComponent(tg)}`}
                      className="text-[11px] px-2 py-0.5 rounded-full border border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground transition"
                    >
                      #{tg}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related */}
          {related.length > 0 && (
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">أدوات مشابهة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {related.map((r) => {
                  const rHost = hostOf(r.url);
                  const rLogo = r.logo_url || (rHost ? `https://logo.clearbit.com/${rHost}` : "");
                  return (
                    <Link
                      key={r.id}
                      to={`/teach-technics/tool/${r.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition"
                    >
                      {rLogo && (
                        <img src={rLogo} alt="" className="w-8 h-8 rounded bg-white/90 p-1 object-contain flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{r.title}</p>
                        {r.subtitle && <p className="text-[11px] text-muted-foreground truncate">{r.subtitle}</p>}
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
      <BackToTop />
    </div>

  );
}
