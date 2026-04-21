import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getLevelMeta } from "@/lib/levels";

/**
 * Applies a unique visual identity (primary color tone + body class)
 * for every level. Each year of secondary has its own color too.
 * Runs whenever the user level/branch changes.
 */
export function useLevelTheme() {
  const { user } = useAuth();
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Reset prior level classes
    Array.from(body.classList).forEach((c) => {
      if (c.startsWith("level-")) body.classList.remove(c);
    });

    const meta = getLevelMeta(user?.level);
    if (!meta) return;

    // Apply tonal primary per level
    root.style.setProperty("--primary", meta.color);
    root.style.setProperty("--accent", meta.color);
    root.style.setProperty("--ring", meta.color);

    // Add body class so pages can opt into level-specific layout
    body.classList.add(`level-${meta.group}`);
    body.classList.add(`level-${user?.level}`);
    if (user?.branch) body.classList.add(`branch-${user.branch}`);
  }, [user?.level, user?.branch]);
}

/** Returns badge data { label, icon, color } for the current user level */
export function useLevelBadge() {
  const { user } = useAuth();
  const meta = getLevelMeta(user?.level);
  if (!meta) return null;
  return { label: meta.label, icon: meta.icon, color: meta.color, group: meta.group };
}
