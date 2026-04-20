import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getLevelFromXP, getLevelTitle, BADGES } from "@/lib/gamification";
import { Trophy, Flame, Award } from "lucide-react";

export function XPDisplay({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [xp, setXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("xp, streak_days").eq("user_id", user.id).maybeSingle();
      if (p) {
        setXP(p.xp || 0);
        setStreak(p.streak_days || 0);
      }
      const { data: b } = await supabase.from("user_badges").select("badge_key").eq("user_id", user.id);
      if (b) setBadges(b.map((x) => x.badge_key));
    })();
  }, [user?.id]);

  const lvl = getLevelFromXP(xp);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1 text-primary font-bold">
          <Trophy className="w-3.5 h-3.5" /> Lv.{lvl.level}
        </span>
        {streak > 0 && (
          <span className="flex items-center gap-1 text-orange-400">
            <Flame className="w-3.5 h-3.5" /> {streak}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">المستوى</p>
          <p className="text-2xl font-bold text-primary">Lv. {lvl.level}</p>
          <p className="text-xs text-muted-foreground">{getLevelTitle(lvl.level)}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-orange-400 font-bold">
            <Flame className="w-4 h-4" /> {streak} {streak > 0 ? "يوم" : ""}
          </div>
          <p className="text-xs text-muted-foreground">{xp} XP إجمالي</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">{lvl.current} / {lvl.needed} XP</span>
          <span className="text-primary font-bold">{Math.floor(lvl.progress)}%</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all" style={{ width: `${lvl.progress}%` }} />
        </div>
      </div>

      {badges.length > 0 && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Award className="w-3.5 h-3.5" /> الشارات ({badges.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {badges.map((k) => {
              const b = BADGES[k];
              if (!b) return null;
              return (
                <div key={k} title={`${b.label} — ${b.description}`} className="text-2xl hover:scale-125 transition cursor-help">
                  {b.icon}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
