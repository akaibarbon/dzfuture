import { useState } from "react";
import { Accessibility, Type, Eye, Sparkles, Zap, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAppSettings, applyAppSettings, FontScale } from "@/hooks/use-app-settings";

export function AccessibilityPanel() {
  const s = useAppSettings();
  const [open, setOpen] = useState(false);

  const update = (fn: () => void) => {
    fn();
    setTimeout(() => applyAppSettings(useAppSettings.getState()), 0);
  };

  const speak = (txt: string) => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = "ar-SA";
    speechSynthesis.speak(u);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="fixed bottom-4 left-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition focus:ring-4 focus:ring-primary/40"
          aria-label="إعدادات إمكانية الوصول"
        >
          <Accessibility className="w-6 h-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[340px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="text-right flex items-center gap-2 justify-end">
            إمكانية الوصول <Accessibility className="w-5 h-5 text-primary" />
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6 text-right">
          <Row icon={<Zap className="w-4 h-4" />} label="وضع البيانات الضعيفة" desc="يوقف الرسوم المتحركة والتأثيرات لحفظ الباقة">
            <Switch checked={s.ultraLight} onCheckedChange={() => update(() => s.toggle("ultraLight"))} />
          </Row>

          <Row icon={<Eye className="w-4 h-4" />} label="تباين عالٍ" desc="ألوان حادة لرؤية أوضح">
            <Switch checked={s.highContrast} onCheckedChange={() => update(() => s.toggle("highContrast"))} />
          </Row>

          <Row icon={<Type className="w-4 h-4" />} label="خط عسر القراءة" desc="خط مريح لمن يعانون من عسر القراءة">
            <Switch checked={s.dyslexiaFont} onCheckedChange={() => update(() => s.toggle("dyslexiaFont"))} />
          </Row>

          <Row icon={<Sparkles className="w-4 h-4" />} label="تقليل الحركة" desc="إزالة الانتقالات والرسوم">
            <Switch checked={s.reducedMotion} onCheckedChange={() => update(() => s.toggle("reducedMotion"))} />
          </Row>

          <Row icon={<Volume2 className="w-4 h-4" />} label="قارئ الشاشة" desc="نطق العناصر بالضغط عليها">
            <Switch
              checked={s.screenReader}
              onCheckedChange={() => {
                update(() => s.toggle("screenReader"));
                if (!s.screenReader) speak("تم تفعيل قارئ الشاشة");
              }}
            />
          </Row>

          <div>
            <p className="text-sm font-semibold mb-2">حجم الخط</p>
            <div className="grid grid-cols-4 gap-2">
              {(["sm", "md", "lg", "xl"] as FontScale[]).map((sz) => (
                <Button
                  key={sz}
                  size="sm"
                  variant={s.fontScale === sz ? "default" : "outline"}
                  onClick={() => update(() => s.setFontScale(sz))}
                >
                  {sz.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border text-xs text-muted-foreground">
            🌟 تم تصميم هذه الميزات لجعل المنصة في متناول الجميع.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ icon, label, desc, children }: { icon: React.ReactNode; label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border bg-card/50">
      <div className="flex-1">
        <div className="flex items-center gap-2 justify-end font-semibold text-sm">
          <span>{label}</span>
          <span className="text-primary">{icon}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      </div>
      {children}
    </div>
  );
}
