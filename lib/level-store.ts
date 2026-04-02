import { create } from "zustand";

interface LevelStore {
  level: number;
  setLevel: (level: number) => void;
}

export const useLevelStore = create<LevelStore>((set) => ({
  level: 1,
  setLevel: (level) => set({ level }),
}));
