import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string; // UUID from auth.users
  fullName: string;
  email: string;
  role: string;
  serialNumber?: string;
  photoUrl?: string;
  nickname?: string;
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
      logout: () => set({ user: null }),
    }),
    { name: 'uno-auth-storage' }
  )
);
