import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Lightbulb,
  ExternalLink,
  BookOpen,
  Youtube,
  FlaskConical,
  Globe2,
  Sparkles,
  GraduationCap,
  Search,
  Star,
  Rocket,
  Presentation,
  PenTool,
  Mic,
  Image as ImageIcon,
  Brain,
  Filter,
  Settings2,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchPublicItems, TTItem } from "@/lib/teach-technics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ToolCategory = "writing" | "visual" | "audio" | "research" | "classroom";

interface AITool {
  id: string;
  name: string;
  logo: string;
  url: string;
  tagline: string;
  category: ToolCategory;
  level: "مبتدئ" | "متوسط" | "متقدم";
  free: boolean;
  features: string[];
  howTo: string[];
  tags: string[];
}

const CATEGORY_META: Record<ToolCategory, { label: string; icon: any; color: string }> = {
  writing: { label: "كتابة", icon: PenTool, color: "text-sky-400" },
  visual: { label: "بصري", icon: ImageIcon, color: "text-fuchsia-400" },
  audio: { label: "صوت", icon: Mic, color: "text-emerald-400" },
  research: { label: "بحث", icon: Brain, color: "text-amber-400" },
  classroom: { label: "قسم", icon: Presentation, color: "text-primary" },
};

const TIP_ICONS = [Rocket, Sparkles, GraduationCap, Brain];

const FAV_KEY = "teach-technics-favs-v1";

function normalizeTool(i: TTItem): AITool {
  const cat = (["writing", "visual", "audio", "research", "classroom"].includes(i.category ?? "")
    ? i.category
    : "writing") as ToolCategory;
  const lvl = (["مبتدئ", "متوسط", "متقدم"].includes(i.level ?? "")
    ? i.level
    : "مبتدئ") as AITool["level"];
  const host = i.url ? (() => { try { return new URL(i.url!).hostname.replace(/^www\./, ""); } catch { return ""; } })() : "";
  return {
    id: i.id,
    name: i.title,
    logo: i.logo_url || (host ? `https://logo.clearbit.com/${host}` : ""),
    url: i.url ?? "#",
    tagline: i.subtitle ?? "",
    category: cat,
    level: lvl,
    free: i.is_free ?? true,
    features: i.features,
    howTo: i.how_to,
    tags: i.tags,
  };
}

export default function TeachTechnicsPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<ToolCategory | "all" | "fav">("all");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");
  const [sortBy, setSortBy] = useState<"relevance" | "name" | "level" | "favFirst">("relevance");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [favs, setFavs] = useState<string[]>([]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["teach-technics-public"],
    queryFn: fetchPublicItems,
  });

  const AI_TOOLS = useMemo(
    () =>
      items
        .filter((i) => i.kind === "tool")
        .map(normalizeTool),
    [items],
  );
  const QUICK_TIPS = useMemo(
    () =>
      items
        .filter((i) => i.kind === "tip")
        .map((i, idx) => ({ icon: TIP_ICONS[idx % TIP_ICONS.length], title: i.title, body: i.body ?? "" })),
    [items],
  );
  const METHODS = useMemo(
    () =>
      items
        .filter((i) => i.kind === "method")
        .map((i) => ({ country: i.subtitle ?? "", title: i.title, body: i.body ?? "" })),
    [items],
  );
  const RESEARCH = useMemo(
    () =>
      items
        .filter((i) => i.kind === "research")
        .map((i) => ({ title: i.title, org: i.subtitle ?? "", url: i.url ?? "#" })),
    [items],
  );
  const VIDEOS = useMemo(
    () =>
      items
        .filter((i) => i.kind === "video")
        .map((i) => ({ title: i.title, channel: i.subtitle ?? "", url: i.url ?? "#" })),
    [items],
  );
  const SITES = useMemo(
    () =>
      items
        .filter((i) => i.kind === "site")
        .map((i) => ({ name: i.title, url: i.url ?? "#", desc: i.body ?? "" })),
    [items],
  );

  // Load favorites: from DB when signed in (sync across devices), else localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (user?.id) {
        const { data, error } = await supabase
          .from("teach_technics_favorites")
          .select("tool_name")
          .eq("user_id", user.id);
        if (!cancelled && !error && data) {
          const dbFavs = data.map((r: any) => r.tool_name);
          // Migrate any local favs to DB once
          try {
            const s = localStorage.getItem(FAV_KEY);
            if (s) {
              const local: string[] = JSON.parse(s);
              const missing = local.filter((n) => !dbFavs.includes(n));
              if (missing.length) {
                await supabase.from("teach_technics_favorites").upsert(
                  missing.map((tool_name) => ({ user_id: user.id, tool_name })),
                  { onConflict: "user_id,tool_name" },
                );
                dbFavs.push(...missing);
              }
              localStorage.removeItem(FAV_KEY);
            }
          } catch {}
          setFavs(dbFavs);
        }
      } else {
        try { const s = localStorage.getItem(FAV_KEY); if (s) setFavs(JSON.parse(s)); } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const toggleFav = async (name: string) => {
    const isFav = favs.includes(name);
    const next = isFav ? favs.filter((n) => n !== name) : [...favs, name];
    setFavs(next);
    if (user?.id) {
      const { error } = isFav
        ? await supabase.from("teach_technics_favorites").delete()
            .eq("user_id", user.id).eq("tool_name", name)
        : await supabase.from("teach_technics_favorites")
            .insert({ user_id: user.id, tool_name: name });
      if (error) {
        setFavs(favs);
        toast.error("تعذّرت مزامنة المفضلات");
      }
    } else {
      try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch {}
    }
  };
  const toggleTag = (tag: string) => {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };
  const clearFilters = () => {
    setQuery(""); setCat("all"); setPriceFilter("all"); setActiveTags([]); setSortBy("relevance");
  };

  const allTags = useMemo(() => {
    const map = new Map<string, number>();
    AI_TOOLS.forEach((t) => t.tags.forEach((tg) => map.set(tg, (map.get(tg) || 0) + 1)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
  }, [AI_TOOLS]);

  const levelRank: Record<AITool["level"], number> = { "مبتدئ": 0, "متوسط": 1, "متقدم": 2 };

  const scored = useMemo(() => {
    const q = query.trim().toLowerCase();
    const terms = q ? q.split(/\s+/).filter(Boolean) : [];
    return AI_TOOLS
      .map((t) => {
        if (cat === "fav" && !favs.includes(t.name)) return null;
        if (cat !== "all" && cat !== "fav" && t.category !== cat) return null;
        if (priceFilter === "free" && !t.free) return null;
        if (priceFilter === "paid" && t.free) return null;
        if (activeTags.length && !activeTags.every((tag) => t.tags.includes(tag))) return null;

        let score = 0;
        if (terms.length) {
          const name = t.name.toLowerCase();
          const tagline = t.tagline.toLowerCase();
          const tagsL = t.tags.map((x) => x.toLowerCase());
          const featL = t.features.map((f) => f.toLowerCase());
          for (const term of terms) {
            let hit = 0;
            if (name.includes(term)) hit += 10;
            if (tagsL.some((x) => x === term)) hit += 8;
            if (tagsL.some((x) => x.includes(term))) hit += 5;
            if (tagline.includes(term)) hit += 4;
            if (featL.some((f) => f.includes(term))) hit += 2;
            if (hit === 0) return null;
            score += hit;
          }
        }
        if (favs.includes(t.name)) score += 1;
        return { tool: t, score };
      })
      .filter((x): x is { tool: AITool; score: number } => x !== null)
      .sort((a, b) => {
        if (sortBy === "name") return a.tool.name.localeCompare(b.tool.name);
        if (sortBy === "level") return levelRank[a.tool.level] - levelRank[b.tool.level];
        if (sortBy === "favFirst") {
          const af = favs.includes(a.tool.name) ? 1 : 0;
          const bf = favs.includes(b.tool.name) ? 1 : 0;
          if (af !== bf) return bf - af;
          return b.score - a.score;
        }
        // relevance
        if (terms.length) return b.score - a.score;
        return a.tool.name.localeCompare(b.tool.name);
      });
  }, [query, cat, priceFilter, activeTags, sortBy, favs]);

  const filtered = scored.map((s) => s.tool);
  const activeFilterCount = (cat !== "all" ? 1 : 0) + (priceFilter !== "all" ? 1 : 0) + activeTags.length + (query ? 1 : 0);

  if (!user) return <Navigate to="/auth" replace />;
  const canManage = user.role === "admin" || user.role === "tutor";
  if (user.role !== "tutor" && user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" dir="rtl">
        <GraduationCap className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold">صفحة خاصة بالأساتذة</h1>
        <p className="text-muted-foreground mt-2">هذه الصفحة متاحة فقط لأعضاء هيئة التدريس.</p>
      </div>
    );
  }

  const categoryKeys: (ToolCategory | "all" | "fav")[] = ["all", "writing", "visual", "audio", "research", "classroom", "fav"];


  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-28" dir="rtl">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl p-6 md:p-10 border border-primary/30 bg-gradient-to-br from-primary/20 via-background to-background shadow-2xl">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-fuchsia-500/10 rounded-full blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg flex-shrink-0">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <Badge variant="outline" className="mb-2 gap-1"><Rocket className="w-3 h-3" /> نسخة 2026</Badge>
            <h1 className="text-2xl md:text-4xl font-bold font-display text-glow leading-tight">Teach Technics</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-2 leading-relaxed max-w-2xl">
              دليل الأستاذ العصري: طرق التدريس الحديثة، أبحاث محكّمة، فيديوهات ملهمة،
              وأقوى أدوات الذكاء الاصطناعي التي تضاعف تأثيرك في الفصل.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 text-xs items-center">
              <Badge className="bg-primary/20 text-primary border-primary/30">{AI_TOOLS.length} أداة AI</Badge>
              <Badge variant="outline">{METHODS.length} طريقة عالمية</Badge>
              <Badge variant="outline">{RESEARCH.length} بحث أكاديمي</Badge>
              {canManage && (
                <Button asChild size="sm" variant="outline" className="gap-1 ms-auto">
                  <Link to="/teach-technics/admin">
                    <Settings2 className="w-3.5 h-3.5" />
                    {user.role === "admin" ? "لوحة الإدارة" : "اقتراح / إدارة"}
                  </Link>
                </Button>
              )}
              {isLoading && <span className="text-muted-foreground text-[11px]">جاري التحميل...</span>}
            </div>
          </div>
        </div>
      </header>


      {/* Quick tips */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {QUICK_TIPS.map((t, i) => (
          <Card key={i} className="glass-panel">
            <CardContent className="p-3 md:p-4">
              <t.icon className="w-5 h-5 text-primary mb-2" />
              <p className="text-sm font-bold leading-tight">{t.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* AI Tools with search + filter */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl md:text-2xl font-bold font-display">أدوات الذكاء الاصطناعي</h2>
          <Badge variant="outline" className="ms-auto">{filtered.length} من {AI_TOOLS.length}</Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالاسم، الميزة أو الوسم..."
              className="ps-9"
            />
          </div>
          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value as any)}
            className="h-9 rounded-md border border-border bg-background px-2 text-xs"
            aria-label="التصفية حسب السعر"
          >
            <option value="all">كل الأسعار</option>
            <option value="free">مجاني فقط</option>
            <option value="paid">مدفوع فقط</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 rounded-md border border-border bg-background px-2 text-xs"
            aria-label="ترتيب النتائج"
          >
            <option value="relevance">الأنسب</option>
            <option value="name">الاسم (أ-ي)</option>
            <option value="level">الأسهل أولاً</option>
            <option value="favFirst">المفضّلات أولاً</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {categoryKeys.map((k) => {
            const isFav = k === "fav";
            const isAll = k === "all";
            const meta = !isFav && !isAll ? CATEGORY_META[k as ToolCategory] : null;
            const Icon = isFav ? Star : isAll ? Sparkles : meta!.icon;
            const label = isFav ? `مفضّلاتي (${favs.length})` : isAll ? "الكل" : meta!.label;
            const active = cat === k;
            return (
              <button
                key={k}
                onClick={() => setCat(k)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow"
                    : "bg-background border-border hover:border-primary/40 text-foreground/80"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Tag cloud */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground me-1">وسوم:</span>
          {allTags.map(({ tag, count }) => {
            const active = activeTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                  active
                    ? "bg-primary/20 text-primary border-primary/40"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                #{tag} <span className="opacity-60">{count}</span>
              </button>
            );
          })}
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-[11px] px-2 py-0.5 rounded-full border border-destructive/30 text-destructive hover:bg-destructive/10 transition ms-auto"
            >
              مسح الكل ({activeFilterCount})
            </button>
          )}
        </div>


        {filtered.length === 0 ? (
          <Card className="glass-panel">
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              لا توجد أدوات مطابقة لبحثك.
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((tool) => {
              const meta = CATEGORY_META[tool.category];
              const isFav = favs.includes(tool.name);
              return (
                <Card key={tool.name} className="glass-panel hover:border-primary/40 transition flex flex-col relative group">
                  <button
                    onClick={() => toggleFav(tool.name)}
                    aria-label="مفضّلة"
                    className="absolute top-3 end-3 p-1.5 rounded-full hover:bg-primary/10 transition z-10"
                  >
                    <Star className={`w-4 h-4 ${isFav ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                  </button>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3 pe-8">
                      <img
                        src={tool.logo}
                        alt={`${tool.name} logo`}
                        loading="lazy"
                        className="w-10 h-10 rounded-lg bg-white/90 p-1 object-contain flex-shrink-0"
                        onError={(e) => {
                          const el = e.currentTarget;
                          const host = new URL(tool.url).hostname.replace(/^www\./, "");
                          if (!el.dataset.fallback) {
                            el.dataset.fallback = "1";
                            el.src = `https://logo.clearbit.com/${host}`;
                          } else if (el.dataset.fallback === "1") {
                            el.dataset.fallback = "2";
                            el.src = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
                          }
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg leading-tight truncate">{tool.name}</CardTitle>
                        <p className="text-xs text-primary/80 mt-0.5 line-clamp-2">{tool.tagline}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <Badge variant="outline" className={`gap-1 ${meta.color} border-current/30`}>
                        <meta.icon className="w-3 h-3" /> {meta.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{tool.level}</Badge>
                      {tool.free
                        ? <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30">مجاني</Badge>
                        : <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30">مدفوع</Badge>}
                    </div>

                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-2.5">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">الميزات</p>
                        <ul className="text-sm text-foreground/80 space-y-1 list-disc pe-4">
                          {tool.features.map((f, i) => <li key={i} className="leading-snug">{f}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">كيف تستعمله</p>
                        <ol className="text-sm text-foreground/80 space-y-1 list-decimal pe-4">
                          {tool.howTo.map((h, i) => <li key={i} className="leading-snug">{h}</li>)}
                        </ol>
                      </div>
                      <div className="flex flex-wrap gap-1">

                        {tool.tags.map((tg) => {
                          const on = activeTags.includes(tg);
                          return (
                            <button
                              key={tg}
                              onClick={() => toggleTag(tg)}
                              className={`text-[10px] px-1.5 py-0.5 rounded border transition ${
                                on
                                  ? "bg-primary/20 text-primary border-primary/40"
                                  : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                              }`}
                            >
                              #{tg}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Button asChild size="sm" variant="outline" className="w-full gap-2">
                      <a href={tool.url} target="_blank" rel="noreferrer">
                        افتح {tool.name} <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Methods */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl md:text-2xl font-bold font-display">الطرق التعليمية العالمية</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {METHODS.map((m, i) => (
            <Card key={i} className="glass-panel hover:border-primary/30 transition">
              <CardHeader className="pb-2">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Globe2 className="w-3 h-3" />{m.country}
                </div>
                <CardTitle className="text-lg mt-1">{m.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/80 leading-relaxed">{m.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Research */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-primary" />
          <h2 className="text-xl md:text-2xl font-bold font-display">أبحاث ومراجع</h2>
        </div>
        <Card className="glass-panel">
          <CardContent className="p-4 space-y-3">
            {RESEARCH.map((r) => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.org}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
              </a>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Videos */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-500" />
          <h2 className="text-xl md:text-2xl font-bold font-display">فيديوهات ملهمة</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {VIDEOS.map((v) => (
            <a key={v.url} href={v.url} target="_blank" rel="noreferrer" className="block group">
              <Card className="glass-panel h-full hover:border-primary/40 transition">
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-red-500/20 to-primary/10 flex items-center justify-center">
                    <Youtube className="w-10 h-10 text-red-500/80 group-hover:scale-110 transition" />
                  </div>
                  <p className="text-xs text-muted-foreground">{v.channel}</p>
                  <p className="text-sm font-medium leading-snug">{v.title}</p>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </section>

      {/* Sites */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="text-xl md:text-2xl font-bold font-display">مواقع مرجعية للأساتذة</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {SITES.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="block">
              <Card className="glass-panel h-full hover:border-primary/40 transition">
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold">{s.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
