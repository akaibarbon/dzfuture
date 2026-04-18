import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DarkModeState {
  isDark: boolean;
  toggle: () => void;
}

export const useDarkMode = create<DarkModeState>()(
  persist(
    (set, get) => ({
      isDark: true, // default dark
      toggle: () => {
        const next = !get().isDark;
        if (next) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        set({ isDark: next });
      },
    }),
    {
      name: 'uno-dark-mode',
      onRehydrateStorage: () => (state) => {
        if (state?.isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
    }
  )
);
