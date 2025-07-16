// store/useSimulationStore.ts
import { create } from 'zustand';

interface SimulationState {
  paused: boolean;
  speed: number;
  setPaused: (v: boolean) => void;
  setSpeed: (v: number) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  paused: false,
  speed: 1,
  setPaused: (paused) => set({ paused }),
  setSpeed: (speed) => set({ speed }),
}));
