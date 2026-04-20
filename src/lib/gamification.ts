import { supabase } from "@/integrations/supabase/client";

export interface Badge {
  key: string;
  label: string;
  icon: string;
  description: string;
  xp: number;
}

export const BADGES: Record<string, Badge> = {
  first_login: { key: "first_login", label: "البداية", icon: "🌟", description: "أول دخول للمنصة", xp: 10 },
  first_message: { key: "first_message", label: "متحدث", icon: "💬", description: "أرسلت أول رسالة", xp: 15 },
  first_lesson: { key: "first_lesson", label: "متعلم", icon: "📚", description: "فتحت أول درس", xp: 20 },
  ai_master: { key: "ai_master", label: "خبير AI", icon: "🤖", description: "10 محادثات مع AI", xp: 50 },
  streak_3: { key: "streak_3", label: "مثابر", icon: "🔥", description: "3 أيام متتالية", xp: 30 },
  streak_7: { key: "streak_7", label: "أسطورة", icon: "⚡", description: "7 أيام متتالية", xp: 100 },
  streak_30: { key: "streak_30", label: "بطل", icon: "👑", description: "30 يوم متتالي", xp: 500 },
  group_join: { key: "group_join", label: "اجتماعي", icon: "👥", description: "انضممت لمجموعة", xp: 25 },
  tutor_fav: { key: "tutor_fav", label: "تابع", icon: "❤️", description: "أضفت أستاذاً للمفضلة", xp: 15 },
  scheduler: { key: "scheduler", label: "منظّم", icon: "📅", description: "أنشأت جدولاً يومياً", xp: 20 },
};

// Calculate level from XP (every 100 XP = 1 level, with curve)
export function getLevelFromXP(xp: number): { level: number; current: number; needed: number; progress: number } {
  const level = Math.floor(Math.sqrt(xp / 50)) + 1;
  const currentLevelXP = (level - 1) ** 2 * 50;
  const nextLevelXP = level ** 2 * 50;
  const current = xp - currentLevelXP;
  const needed = nextLevelXP - currentLevelXP;
  return { level, current, needed, progress: (current / needed) * 100 };
}

export function getLevelTitle(level: number): string {
  if (level >= 50) return "أسطورة 👑";
  if (level >= 30) return "خبير ⚡";
  if (level >= 20) return "متمكن 🔥";
  if (level >= 10) return "متقدم ⭐";
  if (level >= 5) return "نشيط 🌟";
  return "مبتدئ 🌱";
}

export async function awardXP(userId: string, amount: number, reason: string): Promise<number | null> {
  try {
    const { data: profile } = await supabase.from("profiles").select("xp").eq("user_id", userId).maybeSingle();
    if (!profile) return null;
    const newXP = (profile.xp || 0) + amount;
    await supabase.from("profiles").update({ xp: newXP }).eq("user_id", userId);
    await supabase.from("xp_events").insert({ user_id: userId, amount, reason });
    return newXP;
  } catch (e) {
    console.error("awardXP error:", e);
    return null;
  }
}

export async function awardBadge(userId: string, badgeKey: string): Promise<boolean> {
  const badge = BADGES[badgeKey];
  if (!badge) return false;
  const { error } = await supabase.from("user_badges").insert({ user_id: userId, badge_key: badgeKey });
  if (error) return false;
  await awardXP(userId, badge.xp, `badge:${badgeKey}`);
  return true;
}

export async function updateStreak(userId: string): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const { data: profile } = await supabase.from("profiles").select("streak_days, last_active_date").eq("user_id", userId).maybeSingle();
  if (!profile) return 0;
  if (profile.last_active_date === today) return profile.streak_days || 0;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const newStreak = profile.last_active_date === yesterday ? (profile.streak_days || 0) + 1 : 1;

  await supabase.from("profiles").update({ streak_days: newStreak, last_active_date: today }).eq("user_id", userId);

  // Award streak badges
  if (newStreak === 3) await awardBadge(userId, "streak_3");
  if (newStreak === 7) await awardBadge(userId, "streak_7");
  if (newStreak === 30) await awardBadge(userId, "streak_30");

  return newStreak;
}
