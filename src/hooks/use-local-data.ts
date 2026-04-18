import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Local data store to replace backend API
export interface AgendaItem {
  id: number;
  title: string;
  date: string;
  time: string;
  type: 'exam' | 'homework' | 'revision' | 'meeting' | 'other';
  completed: boolean;
}

export interface ProgrammeSubject {
  id: number;
  name: string;
  coefficient: number;
  color: string;
  topics: string[];
}

export interface Group {
  id: number;
  name: string;
  isPrivate: boolean;
  password?: string;
  createdBy: number;
}

export interface Message {
  id: number;
  groupId: number;
  senderId: number;
  senderName: string;
  content: string;
  fileUrl?: string;
  createdAt: string;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
}

interface DataState {
  agendaItems: AgendaItem[];
  addAgendaItem: (item: Omit<AgendaItem, 'id'>) => void;
  toggleAgendaItem: (id: number) => void;
  removeAgendaItem: (id: number) => void;

  groups: Group[];
  addGroup: (group: Omit<Group, 'id'>) => void;

  messages: Message[];
  addMessage: (msg: Omit<Message, 'id' | 'createdAt'>) => void;

  events: Event[];
  addEvent: (event: Omit<Event, 'id'>) => void;
  removeEvent: (id: number) => void;

  verifiedGroups: number[];
  toggleVerifiedGroup: (id: number) => void;

  visits: number;
  incrementVisits: () => void;
}

export const useLocalData = create<DataState>()(
  persist(
    (set, get) => ({
      agendaItems: [
        { id: 1, title: "Math Exam - Chapter 5", date: "2026-03-10", time: "09:00", type: "exam", completed: false },
        { id: 2, title: "Physics Homework", date: "2026-03-08", time: "14:00", type: "homework", completed: false },
        { id: 3, title: "Group Revision Session", date: "2026-03-12", time: "16:00", type: "revision", completed: false },
      ],
      addAgendaItem: (item) => set((s) => ({
        agendaItems: [...s.agendaItems, { ...item, id: Date.now() }]
      })),
      toggleAgendaItem: (id) => set((s) => ({
        agendaItems: s.agendaItems.map(i => i.id === id ? { ...i, completed: !i.completed } : i)
      })),
      removeAgendaItem: (id) => set((s) => ({
        agendaItems: s.agendaItems.filter(i => i.id !== id)
      })),

      groups: [
        { id: 1, name: "Math Masters", isPrivate: false, createdBy: 1 },
        { id: 2, name: "Secret Science Lab", isPrivate: true, password: "science123", createdBy: 1 },
        { id: 3, name: "History Scholars", isPrivate: false, createdBy: 2 },
      ],
      addGroup: (group) => set((s) => ({
        groups: [...s.groups, { ...group, id: Date.now() }]
      })),

      messages: [
        { id: 1, groupId: 1, senderId: 1, senderName: "Younes", content: "Welcome to Math Masters!", createdAt: new Date().toISOString() },
        { id: 2, groupId: 1, senderId: 2, senderName: "Ahmed", content: "Ready to study!", createdAt: new Date().toISOString() },
      ],
      addMessage: (msg) => set((s) => ({
        messages: [...s.messages, { ...msg, id: Date.now(), createdAt: new Date().toISOString() }]
      })),

      events: [
        { id: 1, title: "Welcome to Future DZ!", description: "The legendary learning hub is now open. Start your journey today.", date: "2026-03-06" },
        { id: 2, title: "New Study Methods Added", description: "Check out the Study Helps section for techniques from Japan, China, and Britain.", date: "2026-03-05" },
      ],
      addEvent: (event) => set((s) => ({
        events: [...s.events, { ...event, id: Date.now() }]
      })),
      removeEvent: (id) => set((s) => ({
        events: s.events.filter((e) => e.id !== id)
      })),

      verifiedGroups: [] as number[],
      toggleVerifiedGroup: (id) => set((s) => ({
        verifiedGroups: s.verifiedGroups.includes(id)
          ? s.verifiedGroups.filter((g) => g !== id)
          : [...s.verifiedGroups, id]
      })),

      visits: 1247,
      incrementVisits: () => set((s) => ({ visits: s.visits + 1 })),
    }),
    { name: 'uno-data-storage' }
  )
);
