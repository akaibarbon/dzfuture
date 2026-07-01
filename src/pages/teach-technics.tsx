import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  ExternalLink,
  BookOpen,
  Youtube,
  FlaskConical,
  Globe2,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { Navigate } from "react-router-dom";

// Real product logos served from official CDNs / clearbit fallback
const AI_TOOLS = [
  {
    name: "Google Gemini",
    logo: "https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg",
    url: "https://gemini.google.com",
    tagline: "مساعد ذكي متعدد الوسائط من Google",
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
  },
  {
    name: "Gamma",
    logo: "https://cdn.gamma.app/favicon-32x32.png",
    url: "https://gamma.app",
    tagline: "توليد عروض تقديمية احترافية بضغطة زر",
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
  },
  {
    name: "NotebookLM",
    logo: "https://notebooklm.google.com/_/static/branding/v3/notebooklm_logo_32.png",
    url: "https://notebooklm.google.com",
    tagline: "مختبر بحثي شخصي مبني على مصادرك أنت",
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
  },
  {
    name: "ChatGPT",
    logo: "https://cdn.oaistatic.com/assets/favicon-eex17e3i.svg",
    url: "https://chat.openai.com",
    tagline: "أشهر مساعد كتابي عام الاستخدام",
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
  },
  {
    name: "Claude",
    logo: "https://claude.ai/favicon.ico",
    url: "https://claude.ai",
    tagline: "الأفضل في تحليل النصوص الطويلة والتصحيح",
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
  },
  {
    name: "Perplexity",
    logo: "https://www.perplexity.ai/favicon.ico",
    url: "https://perplexity.ai",
    tagline: "محرك بحث AI بمصادر موثّقة",
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
  },
  {
    name: "Suno AI",
    logo: "https://suno.com/favicon.ico",
    url: "https://suno.com",
    tagline: "توليد أغاني تعليمية جذّابة",
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
  },
  {
    name: "ElevenLabs",
    logo: "https://elevenlabs.io/favicon.ico",
    url: "https://elevenlabs.io",
    tagline: "أصوات بشرية طبيعية بلغات متعددة",
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
  },
  {
    name: "Canva Magic Studio",
    logo: "https://static.canva.com/static/images/favicon.ico",
    url: "https://canva.com",
    tagline: "تصميم بصري بمساعدة الذكاء الاصطناعي",
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
  },
  {
    name: "Khanmigo",
    logo: "https://cdn.kastatic.org/images/favicon.ico",
    url: "https://khanacademy.org/khan-labs",
    tagline: "مساعد Khan Academy للأساتذة والتلاميذ",
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
  },
];

const METHODS = [
  {
    country: "🇫🇮 فنلندا",
    title: "Phenomenon-Based Learning",
    body: "بدل تدريس المواد منفصلة، ادرس ظاهرة كاملة (مثل تغيّر المناخ) من زوايا العلوم والرياضيات واللغة معًا. يحقّق تعلّمًا عميقًا ومترابطًا.",
  },
  {
    country: "🇸🇬 سنغافورة",
    title: "نموذج CPA (Concrete–Pictorial–Abstract)",
    body: "ابدأ بأشياء ملموسة، ثم صور ورسومات، وأخيرًا رموز مجرّدة. الأداة المثالية: اطلب من Gemini توليد أنشطة CPA لأي مفهوم رياضي.",
  },
  {
    country: "🇰🇷 كوريا الجنوبية",
    title: "Spaced Repetition + AI",
    body: "التكرار المتباعد يزيد التذكّر 200٪. استخدم Quizlet AI أو NotebookLM لتوليد بطاقات مراجعة تلقائيًا من دروسك.",
  },
  {
    country: "🇨🇦 كندا",
    title: "Flipped Classroom",
    body: "الشرح في البيت عبر فيديو قصير (Loom + AI subtitles)، والحصّة للتطبيق والنقاش. AI يوفّر عليك ساعات في تحضير الفيديوهات.",
  },
  {
    country: "🇯🇵 اليابان",
    title: "Kaizen التربوي",
    body: "تحسين مستمرّ بخطوات صغيرة. بعد كل حصّة اطلب من ChatGPT تحليل ملاحظات التلاميذ واقتراح تعديل واحد لتجربته الحصّة القادمة.",
  },
  {
    country: "🇺🇸 الولايات المتحدة",
    title: "Universal Design for Learning (UDL)",
    body: "قدّم المحتوى بأشكال متعددة (نص + صوت + فيديو + تفاعل). ElevenLabs وSuno يجعلانك تنتج نسخًا مختلفة من نفس الدرس في دقائق.",
  },
];

const RESEARCH = [
  {
    title: "UNESCO — AI and Education Guidance for Policymakers",
    org: "اليونسكو، 2023",
    url: "https://unesdoc.unesco.org/ark:/48223/pf0000376709",
  },
  {
    title: "OECD — Opportunities, Guidelines and Guardrails for Effective AI in Education",
    org: "OECD، 2024",
    url: "https://www.oecd.org/en/publications/opportunities-guidelines-and-guardrails-for-effective-and-equitable-use-of-ai-in-education_a8ff2f80-en.html",
  },
  {
    title: "MIT — Generative AI in the Classroom",
    org: "MIT Teaching Systems Lab",
    url: "https://tsl.mit.edu",
  },
  {
    title: "Harvard — Teaching with AI: A Guide for Educators",
    org: "Harvard Graduate School of Education",
    url: "https://www.gse.harvard.edu/ideas/usable-knowledge/23/07/embracing-artificial-intelligence-classroom",
  },
];

const VIDEOS = [
  {
    title: "How AI Could Save (Not Destroy) Education — Sal Khan",
    channel: "TED",
    url: "https://www.youtube.com/watch?v=hJP5GqnTrNo",
  },
  {
    title: "Teachers Using AI: Real Classroom Examples",
    channel: "Common Sense Education",
    url: "https://www.youtube.com/watch?v=SsC3XiWMlDA",
  },
  {
    title: "The Future of Learning with Gemini",
    channel: "Google for Education",
    url: "https://www.youtube.com/@GoogleForEducation",
  },
];

const SITES = [
  { name: "AI for Education", url: "https://www.aiforeducation.io", desc: "دورات مجانية للأساتذة حول توظيف AI في الفصل." },
  { name: "Edutopia", url: "https://www.edutopia.org", desc: "مقالات وأبحاث في أساليب التدريس المبتكرة." },
  { name: "Common Sense — AI Ratings", url: "https://www.commonsense.org/education/ai", desc: "تقييم مستقل لأدوات AI التعليمية." },
  { name: "TeachAI", url: "https://www.teachai.org", desc: "مبادرة عالمية تجمع سياسات ومناهج AI للمدارس." },
];

export default function TeachTechnicsPage() {
  const { user } = useAuth();
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

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-28" dir="rtl">
      {/* Header */}
      <header className="rounded-3xl p-6 md:p-8 border border-primary/30 bg-gradient-to-br from-primary/15 via-background to-background shadow-lg">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg flex-shrink-0">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold font-display text-glow">Teach Technics</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-2 leading-relaxed">
              دليل الأستاذ العصري: طرق التدريس الحديثة من الدول المتقدمة، أبحاث محكّمة،
              فيديوهات ملهمة، مواقع مرجعية، وأقوى أدوات الذكاء الاصطناعي التي تضاعف تأثيرك في الفصل.
            </p>
          </div>
        </div>
      </header>

      {/* AI Tools — main section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl md:text-2xl font-bold font-display">أدوات الذكاء الاصطناعي</h2>
          <Badge variant="outline" className="ms-2">10 أدوات</Badge>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AI_TOOLS.map((tool) => (
            <Card key={tool.name} className="glass-panel hover:border-primary/40 transition flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <img
                    src={tool.logo}
                    alt={`${tool.name} logo`}
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
                  <div className="min-w-0">
                    <CardTitle className="text-lg leading-tight">{tool.name}</CardTitle>
                    <p className="text-xs text-primary/80 mt-0.5">{tool.tagline}</p>
                  </div>
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
          ))}
        </div>
      </section>

      {/* Methods */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl md:text-2xl font-bold font-display">الطرق التعليمية العالمية</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {METHODS.map((m, i) => (
            <Card key={i} className="glass-panel">
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
            <a
              key={v.url}
              href={v.url}
              target="_blank"
              rel="noreferrer"
              className="block group"
            >
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
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
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
