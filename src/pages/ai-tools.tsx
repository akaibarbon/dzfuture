import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ExternalLink, Wand2 } from "lucide-react";
import { Navigate } from "react-router-dom";

const TOOLS = [
  { name: "Gamma", url: "https://gamma.app", desc: "إنشاء عروض تقديمية احترافية بالـ AI خلال ثوانٍ — اكتب موضوع الدرس واتركه يصمّم.", category: "عروض تقديمية", emoji: "🎨" },
  { name: "Google Gemini", url: "https://gemini.google.com", desc: "مساعد AI متعدد الاستخدامات لتحضير الدروس والإجابة على أسئلة معقدة.", category: "مساعد ذكي", emoji: "✨" },
  { name: "ChatGPT", url: "https://chat.openai.com", desc: "اطلب منه شرح مفهوم بطرق متعددة، أو توليد تمارين متدرّجة الصعوبة.", category: "مساعد ذكي", emoji: "🤖" },
  { name: "Claude", url: "https://claude.ai", desc: "ممتاز في تحليل الفروض الطويلة ومراجعة المحتوى التعليمي.", category: "مساعد ذكي", emoji: "🧠" },
  { name: "NotebookLM", url: "https://notebooklm.google.com", desc: "ارفع ملفات PDF لدروسك، واسأل عنها مباشرة. يحوّل الملاحظات لبودكاست!", category: "تحليل مستندات", emoji: "📓" },
  { name: "Perplexity", url: "https://perplexity.ai", desc: "محرك بحث AI يعطي إجابات بمصادر موثّقة — مثالي للتحضير العلمي.", category: "بحث", emoji: "🔍" },
  { name: "Suno AI", url: "https://suno.com", desc: "اصنع أغاني تعليمية لحفظ القواعد أو التواريخ بأسلوب جذاب.", category: "صوت", emoji: "🎵" },
  { name: "ElevenLabs", url: "https://elevenlabs.io", desc: "تحويل النص لصوت بشري طبيعي — لإنشاء دروس صوتية.", category: "صوت", emoji: "🎙️" },
  { name: "Canva Magic Studio", url: "https://canva.com", desc: "تصميم ملصقات ومخططات وملخصات مرئية بالـ AI.", category: "تصميم", emoji: "🎨" },
  { name: "Midjourney", url: "https://midjourney.com", desc: "توليد صور توضيحية لأي درس (تاريخ، علوم، أدب).", category: "صور", emoji: "🖼️" },
  { name: "Quizlet AI", url: "https://quizlet.com", desc: "حوّل أي درس إلى بطاقات مراجعة وألعاب تفاعلية تلقائياً.", category: "مراجعة", emoji: "🎴" },
  { name: "Khanmigo", url: "https://khanacademy.org/khan-labs", desc: "مساعد Khan Academy للأساتذة — يساعد في تخطيط الحصص.", category: "تخطيط دروس", emoji: "📐" },
];

export default function AIToolsPage() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== "tutor") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Wand2 className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold">صفحة خاصة بالأساتذة</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto" dir="rtl">
      <header className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
          <Sparkles className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-glow">أدوات AI للتعليم المتقدم</h1>
          <p className="text-muted-foreground text-sm">مجموعة مختارة من أقوى أدوات الذكاء الاصطناعي لتسهيل عملك التعليمي.</p>
        </div>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((tool) => (
          <Card key={tool.name} className="glass-panel hover:border-primary/40 transition flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{tool.emoji}</span>
                  <div>
                    <CardTitle className="text-lg">{tool.name}</CardTitle>
                    <p className="text-[11px] text-primary/70">{tool.category}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between gap-3">
              <p className="text-sm text-foreground/80 leading-relaxed">{tool.desc}</p>
              <Button asChild size="sm" variant="outline" className="w-full gap-2">
                <a href={tool.url} target="_blank" rel="noreferrer">
                  افتح الأداة <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
