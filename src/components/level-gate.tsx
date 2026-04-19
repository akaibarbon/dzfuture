import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LevelPicker } from "./level-picker";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Loader2 } from "lucide-react";
import { getLevelMeta } from "@/lib/levels";

/**
 * Forces every existing account without a `level` to pick one before using the app.
 * Renders a non-dismissable dialog. New signups already collect the level on register.
 */
export function LevelGate() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [level, setLevel] = useState<string | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id || checked) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("level, branch")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data?.level) {
        setOpen(true);
      } else {
        // Sync local store so other components can read it
        (user as any).level = data.level;
        (user as any).branch = data.branch;
      }
      setChecked(true);
    })();
    return () => { cancelled = true; };
  }, [user?.id, checked]);

  const handleSave = async () => {
    if (!user?.id || !level) return;
    const meta = getLevelMeta(level);
    if (meta?.branchRequired && !branch) {
      toast({ title: "اختر الشعبة", description: "هذا المستوى يتطلب اختيار الشعبة.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ level, branch: meta?.branchRequired ? branch : null })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "تعذر الحفظ", description: error.message, variant: "destructive" });
      return;
    }
    updateUser({ ...(user as any), level, branch } as any);
    toast({ title: "✓ تم حفظ مستواك", description: "سيتم عرض المحتوى المناسب لمستواك." });
    setOpen(false);
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="glass-panel sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="w-14 h-14 mx-auto bg-primary/15 rounded-full flex items-center justify-center mb-3 border border-primary/30">
            <GraduationCap className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-center font-display text-2xl text-glow">حدد مستواك الدراسي</DialogTitle>
          <DialogDescription className="text-center">
            لكي نُظهر لك المحتوى المناسب فقط (المجموعات، الدروس، الإعلانات)، اختر مستواك الحالي. يمكنك تغييره لاحقاً من صفحة الحساب.
          </DialogDescription>
        </DialogHeader>
        <div className="pt-2">
          <LevelPicker level={level} branch={branch} onLevelChange={setLevel} onBranchChange={setBranch} />
        </div>
        <Button onClick={handleSave} disabled={!level || saving} className="w-full bg-primary text-primary-foreground font-bold h-12 mt-2">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "حفظ ومتابعة"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
