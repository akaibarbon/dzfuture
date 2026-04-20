import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FontScale = "sm" | "md" | "lg" | "xl";
export type Contrast = "normal" | "high";

interface AppSettings {
  ultraLight: boolean; // disables animations, blurs, large images
  highContrast: boolean;
  fontScale: FontScale;
  dyslexiaFont: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  toggle: (key: keyof Omit<AppSettings, "fontScale" | "setFontScale" | "toggle">) => void;
  setFontScale: (s: FontScale) => void;
}

export const useAppSettings = create<AppSettings>()(
  persist(
    (set) => ({
      ultraLight: false,
      highContrast: false,
      fontScale: "md",
      dyslexiaFont: false,
      reducedMotion: false,
      screenReader: false,
      toggle: (key) => set((s) => ({ ...s, [key]: !s[key as keyof AppSettings] })),
      setFontScale: (fontScale) => set({ fontScale }),
    }),
    { name: "futuredz-settings" }
  )
);

// Apply settings to <html> element
export function applyAppSettings(s: ReturnType<typeof useAppSettings.getState>) {
  const html = document.documentElement;
  html.classList.toggle("ultra-light", s.ultraLight);
  html.classList.toggle("high-contrast", s.highContrast);
  html.classList.toggle("dyslexia-font", s.dyslexiaFont);
  html.classList.toggle("reduced-motion", s.reducedMotion || s.ultraLight);
  const sizes: Record<FontScale, string> = { sm: "14px", md: "16px", lg: "18px", xl: "21px" };
  html.style.fontSize = sizes[s.fontScale];
}
