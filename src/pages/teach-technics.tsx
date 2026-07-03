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
} from "lucide-react";
import { Navigate } from "react-router-dom";

type ToolCategory = "writing" | "visual" | "audio" | "research" | "classroom";

interface AITool {
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

const AI_TOOLS: AITool[] = [
  {
    name: "Google Gemini",
    logo: "https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg",
    url: "https://gemini.google.com",
    tagline: "مساعد ذكي متعدد الوسائط من Google",
    category: "writing", level: "مبتدئ", free: true,
    features: [
      "يفهم النص والصور والصوت في نفس المحادثة",
      "سياق طويل جدًا (حتى مليون رمز) لتحليل ملفات ودروس كاملة",
      "تكامل مباشر مع Docs و Gmail و Drive للأساتذة",
    ],
    howTo: [
      "افتح gemini.google.com وسجّل بحسابك المهني",
      "ألصق نص الدرس واطلب: «حوّله إلى خطة درس 45 دقيقة بأهداف بيداغوجية»",
      "ارفع صورة تمرين وأطلب حلولاً متدرّجة الصعوبة لتلاميذك",
    ],
    tags: ["Google", "متعدد الوسائط", "سياق طويل", "Docs", "خطة درس"],
  },

  {
    name: "Gamma",
    logo: "https://cdn.gamma.app/favicon-32x32.png",
    url: "https://gamma.app",
    tagline: "توليد عروض تقديمية احترافية بضغطة زر",
    category: "visual", level: "مبتدئ", free: true,
    features: [
      "يحوّل موضوعًا نصّيًا إلى عرض كامل بالتصميم والصور",
      "قوالب تعليمية جاهزة (درس، مراجعة، محاضرة)",
      "تصدير PDF / PPT / موقع ويب مباشر",
    ],
    howTo: [
      "اكتب: «عرض عن التحولات الكيميائية للسنة الرابعة متوسط، 10 شرائح»",
      "عدّل النبرة (رسمي / تفاعلي) وأضف صور تلقائية",
      "شارك الرابط مع القسم أو صدّره كملف عرض",
    ],
    tags: ["عروض", "شرائح", "تصميم", "PPT", "قوالب"],
  },

  {
    name: "NotebookLM",
    logo: "https://notebooklm.google.com/_/static/branding/v3/notebooklm_logo_32.png",
    url: "https://notebooklm.google.com",
    tagline: "مختبر بحثي شخصي مبني على مصادرك أنت",
    category: "research", level: "متوسط", free: true,
    features: [
      "ارفع 50 مصدر PDF/رابط/نص واسأل عنها كأنها كتاب واحد",
      "يولّد ملخصات، أسئلة، خرائط ذهنية من مصادرك",
      "ميزة Audio Overview: يحوّل الدرس إلى بودكاست حواري",
    ],
    howTo: [
      "أنشئ Notebook جديد وارفع دروس الفصل PDF",
      "اطلب: «ولّد 20 سؤال تقييم متدرّج مع الإجابات النموذجية»",
      "شغّل «Audio Overview» ليستمع التلاميذ للدرس في الطريق",
    ],
    tags: ["Google", "PDF", "بحث", "بودكاست", "ملخصات", "تقييم"],
  },

  {
    name: "ChatGPT",
    logo: "https://cdn.oaistatic.com/assets/favicon-eex17e3i.svg",
    url: "https://chat.openai.com",
    tagline: "أشهر مساعد كتابي عام الاستخدام",
    category: "writing", level: "مبتدئ", free: true,
    features: [
      "يشرح المفاهيم بمستويات مختلفة (طفل / مراهق / متخصص)",
      "توليد تمارين، رومان تعليمية، سيناريوهات محاكاة",
      "وضع Canvas لتحرير الوثائق تعاونيًا",
    ],
    howTo: [
      "اطلب: «اشرح نظرية طاليس بثلاث طرق مختلفة لتلميذ ضعيف»",
      "استخدم Custom GPT لبناء مساعد متخصص لمادتك",
      "ولّد فرضًا محروسًا بمستوى صعوبة تحدّده أنت",
    ],
    tags: ["OpenAI", "شرح", "تمارين", "Canvas", "Custom GPT"],
  },

  {
    name: "Claude",
    logo: "https://claude.ai/favicon.ico",
    url: "https://claude.ai",
    tagline: "الأفضل في تحليل النصوص الطويلة والتصحيح",
    category: "writing", level: "متقدم", free: true,
    features: [
      "نافذة سياق ضخمة (200K رمز) — يقرأ كتاب كامل",
      "دقّة عالية في تصحيح الفروض المكتوبة يدويًا (بعد OCR)",
      "Artifacts: يولّد صفحات HTML تفاعلية للدروس",
    ],
    howTo: [
      "الصق 30 صفحة من محتوى وحدة واطلب مراجعة شاملة",
      "استخدمه لتصحيح الإنشاءات مع تعليقات بيداغوجية",
      "اطلب أداة تفاعلية (Artifact) لشرح مفهوم صعب",
    ],
    tags: ["Anthropic", "تصحيح", "سياق طويل", "Artifacts", "تحليل نصوص"],
  },

  {
    name: "Perplexity",
    logo: "https://www.perplexity.ai/favicon.ico",
    url: "https://perplexity.ai",
    tagline: "محرك بحث AI بمصادر موثّقة",
    category: "research", level: "مبتدئ", free: true,
    features: [
      "كل إجابة تأتي مع روابط المصادر الأصلية",
      "وضع Academic للأبحاث العلمية المحكّمة",
      "Focus mode للبحث في YouTube أو Reddit أو أوراق أكاديمية",
    ],
    howTo: [
      "اسأل: «آخر الطرق البيداغوجية في تعليم الرياضيات 2025»",
      "فعّل Academic mode لتحضير درس علمي دقيق",
      "احفظ Collections لكل مادة تدرّسها",
    ],
    tags: ["بحث", "مصادر", "أكاديمي", "YouTube", "Collections"],
  },

  {
    name: "Suno AI",
    logo: "https://suno.com/favicon.ico",
    url: "https://suno.com",
    tagline: "توليد أغاني تعليمية جذّابة",
    category: "audio", level: "مبتدئ", free: true,
    features: [
      "يحوّل قاعدة نحوية أو تاريخًا إلى أغنية يحفظها التلميذ بسهولة",
      "يدعم العربية والفرنسية والإنجليزية",
      "تحكّم في الأسلوب (راب / بوب / كلاسيكي)",
    ],
    howTo: [
      "اكتب كلمات تلخّص القاعدة، اختر النمط، اضغط Create",
      "شغّل الأغنية في بداية الحصة كمدخل مشوّق",
      "اطلب من التلاميذ كتابة أغنية عن الدرس كمشروع",
    ],
    tags: ["موسيقى", "أغاني", "حفظ", "عربي", "إبداع"],
  },

  {
    name: "ElevenLabs",
    logo: "https://elevenlabs.io/favicon.ico",
    url: "https://elevenlabs.io",
    tagline: "أصوات بشرية طبيعية بلغات متعددة",
    category: "audio", level: "متوسط", free: false,
    features: [
      "أصوات عربية فصيحة وواقعية جدًا",
      "استنساخ صوت (Voice Clone) لتسجيل دروسك بصوتك دون جهد",
      "دبلجة تلقائية للفيديوهات",
    ],
    howTo: [
      "ألصق الدرس، اختر صوتًا عربيًا، حمّل ملف MP3",
      "أرسله للتلاميذ كنسخة صوتية للمراجعة أثناء التنقّل",
      "استعمله لمساعدة التلاميذ ذوي صعوبات القراءة",
    ],
    tags: ["صوت", "TTS", "دبلجة", "استنساخ صوت", "MP3"],
  },

  {
    name: "Canva Magic Studio",
    logo: "https://static.canva.com/static/images/favicon.ico",
    url: "https://canva.com",
    tagline: "تصميم بصري بمساعدة الذكاء الاصطناعي",
    category: "visual", level: "مبتدئ", free: true,
    features: [
      "Magic Design: يولّد ملصقات ومخططات من وصف نصّي",
      "Magic Write لكتابة محتوى تعليمي داخل التصميم",
      "قوالب تعليمية مجانية لأولياء الأمور والتلاميذ",
    ],
    howTo: [
      "اكتب: «ملصق عن دورة الماء بألوان مبهجة»",
      "استعمل Magic Switch لتحويل نفس المحتوى إلى Story أو منشور",
      "شارك رابط تحرير مع التلاميذ لعمل جماعي",
    ],
    tags: ["تصميم", "ملصقات", "قوالب", "Magic Write", "تعاون"],
  },

  {
    name: "Khanmigo",
    logo: "https://cdn.kastatic.org/images/favicon.ico",
    url: "https://khanacademy.org/khan-labs",
    tagline: "مساعد Khan Academy للأساتذة والتلاميذ",
    category: "classroom", level: "متوسط", free: true,
    features: [
      "لا يعطي الإجابة مباشرة بل يوجّه التلميذ سقراطيًا",
      "أدوات جاهزة: بناء اختبار، خطة درس، تقرير تلميذ",
      "مجاني للأساتذة عبر برنامج Khan Academy Districts",
    ],
    howTo: [
      "سجّل كأستاذ عبر khanmigo.ai",
      "استخدم أداة «Lesson Plan» لإنتاج خطة حصة بدقائق",
      "أعطِ التلاميذ حسابات ليحلّوا التمارين بمساعدة سقراطية",
    ],
    tags: ["Khan Academy", "سقراطي", "خطة درس", "تقييم", "تلاميذ"],
  },

];

const QUICK_TIPS = [
  { icon: Rocket, title: "ابدأ صغيرًا", body: "اختر أداة واحدة فقط هذا الأسبوع (مثلاً Gamma) وطبّقها في حصّة واحدة." },
  { icon: Sparkles, title: "برومبت واضح", body: "اذكر المستوى + المادة + الهدف + عدد الدقائق. النتيجة تتضاعف جودتها." },
  { icon: GraduationCap, title: "راجع دائمًا", body: "AI يخطئ. راجع كل مخرج قبل تقديمه للتلاميذ، خاصة الأرقام والمراجع." },
  { icon: Brain, title: "علّم النقد", body: "شارك التلاميذ كيف تستخدمها لتنمّي عندهم التفكير النقدي لا الاعتماد الأعمى." },
];

const METHODS = [
  { country: "🇫🇮 فنلندا", title: "Phenomenon-Based Learning", body: "بدل تدريس المواد منفصلة، ادرس ظاهرة كاملة (مثل تغيّر المناخ) من زوايا العلوم والرياضيات واللغة معًا. يحقّق تعلّمًا عميقًا ومترابطًا." },
  { country: "🇸🇬 سنغافورة", title: "نموذج CPA (Concrete–Pictorial–Abstract)", body: "ابدأ بأشياء ملموسة، ثم صور ورسومات، وأخيرًا رموز مجرّدة. الأداة المثالية: اطلب من Gemini توليد أنشطة CPA لأي مفهوم رياضي." },
  { country: "🇰🇷 كوريا الجنوبية", title: "Spaced Repetition + AI", body: "التكرار المتباعد يزيد التذكّر 200٪. استخدم Quizlet AI أو NotebookLM لتوليد بطاقات مراجعة تلقائيًا من دروسك." },
  { country: "🇨🇦 كندا", title: "Flipped Classroom", body: "الشرح في البيت عبر فيديو قصير (Loom + AI subtitles)، والحصّة للتطبيق والنقاش. AI يوفّر عليك ساعات في تحضير الفيديوهات." },
  { country: "🇯🇵 اليابان", title: "Kaizen التربوي", body: "تحسين مستمرّ بخطوات صغيرة. بعد كل حصّة اطلب من ChatGPT تحليل ملاحظات التلاميذ واقتراح تعديل واحد لتجربته الحصّة القادمة." },
  { country: "🇺🇸 الولايات المتحدة", title: "Universal Design for Learning (UDL)", body: "قدّم المحتوى بأشكال متعددة (نص + صوت + فيديو + تفاعل). ElevenLabs وSuno يجعلانك تنتج نسخًا مختلفة من نفس الدرس في دقائق." },
];

const RESEARCH = [
  { title: "UNESCO — AI and Education Guidance for Policymakers", org: "اليونسكو، 2023", url: "https://unesdoc.unesco.org/ark:/48223/pf0000376709" },
  { title: "OECD — Opportunities, Guidelines and Guardrails for Effective AI in Education", org: "OECD، 2024", url: "https://www.oecd.org/en/publications/opportunities-guidelines-and-guardrails-for-effective-and-equitable-use-of-ai-in-education_a8ff2f80-en.html" },
  { title: "MIT — Generative AI in the Classroom", org: "MIT Teaching Systems Lab", url: "https://tsl.mit.edu" },
  { title: "Harvard — Teaching with AI: A Guide for Educators", org: "Harvard Graduate School of Education", url: "https://www.gse.harvard.edu/ideas/usable-knowledge/23/07/embracing-artificial-intelligence-classroom" },
];

const VIDEOS = [
  { title: "How AI Could Save (Not Destroy) Education — Sal Khan", channel: "TED", url: "https://www.youtube.com/watch?v=hJP5GqnTrNo" },
  { title: "Teachers Using AI: Real Classroom Examples", channel: "Common Sense Education", url: "https://www.youtube.com/watch?v=SsC3XiWMlDA" },
  { title: "The Future of Learning with Gemini", channel: "Google for Education", url: "https://www.youtube.com/@GoogleForEducation" },
];

const SITES = [
  { name: "AI for Education", url: "https://www.aiforeducation.io", desc: "دورات مجانية للأساتذة حول توظيف AI في الفصل." },
  { name: "Edutopia", url: "https://www.edutopia.org", desc: "مقالات وأبحاث في أساليب التدريس المبتكرة." },
  { name: "Common Sense — AI Ratings", url: "https://www.commonsense.org/education/ai", desc: "تقييم مستقل لأدوات AI التعليمية." },
  { name: "TeachAI", url: "https://www.teachai.org", desc: "مبادرة عالمية تجمع سياسات ومناهج AI للمدارس." },
];

const FAV_KEY = "teach-technics-favs-v1";

export default function TeachTechnicsPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<ToolCategory | "all" | "fav">("all");
  const [favs, setFavs] = useState<string[]>([]);

  useEffect(() => {
    try { const s = localStorage.getItem(FAV_KEY); if (s) setFavs(JSON.parse(s)); } catch {}
  }, []);
  const toggleFav = (name: string) => {
    setFavs((prev) => {
      const next = prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name];
      try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return AI_TOOLS.filter((t) => {
      if (cat === "fav" && !favs.includes(t.name)) return false;
      if (cat !== "all" && cat !== "fav" && t.category !== cat) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.tagline.toLowerCase().includes(q) ||
        t.features.some((f) => f.toLowerCase().includes(q))
      );
    });
  }, [query, cat, favs]);

  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== "tutor") {
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
          <div className="min-w-0">
            <Badge variant="outline" className="mb-2 gap-1"><Rocket className="w-3 h-3" /> نسخة 2026</Badge>
            <h1 className="text-2xl md:text-4xl font-bold font-display text-glow leading-tight">Teach Technics</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-2 leading-relaxed max-w-2xl">
              دليل الأستاذ العصري: طرق التدريس الحديثة، أبحاث محكّمة، فيديوهات ملهمة،
              وأقوى أدوات الذكاء الاصطناعي التي تضاعف تأثيرك في الفصل.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 text-xs">
              <Badge className="bg-primary/20 text-primary border-primary/30">{AI_TOOLS.length} أداة AI</Badge>
              <Badge variant="outline">{METHODS.length} طريقة عالمية</Badge>
              <Badge variant="outline">{RESEARCH.length} بحث أكاديمي</Badge>
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

        <div className="grid gap-3 md:grid-cols-[1fr_auto] items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن أداة أو ميزة..."
              className="ps-9"
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" /> تصنيف
          </div>
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
                      {tool.free && <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30">مجاني</Badge>}
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
