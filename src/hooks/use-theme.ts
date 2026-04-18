import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeColors {
  primary: string; // HSL values like "43 74% 49%"
  label: string;
}

const themePresets: ThemeColors[] = [
  { primary: "43 74% 49%", label: "Gold" },
  { primary: "262 83% 58%", label: "Purple" },
  { primary: "210 100% 50%", label: "Blue" },
  { primary: "142 71% 45%", label: "Emerald" },
  { primary: "0 84% 60%", label: "Red" },
  { primary: "330 81% 60%", label: "Pink" },
  { primary: "24 95% 53%", label: "Orange" },
  { primary: "174 72% 46%", label: "Teal" },
];

interface ThemeState {
  currentTheme: string;
  setTheme: (primary: string) => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      currentTheme: "43 74% 49%",
      setTheme: (primary) => {
        document.documentElement.style.setProperty('--primary', primary);
        document.documentElement.style.setProperty('--accent', primary);
        document.documentElement.style.setProperty('--ring', primary);
        set({ currentTheme: primary });
      },
    }),
    { name: 'uno-theme-storage' }
  )
);

export { themePresets };
export type { ThemeColors };
