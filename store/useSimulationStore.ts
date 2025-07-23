// store/useSimulationStore.ts
import { create } from 'zustand';

interface SimulationState {
  paused: boolean;
  speed: number;
  set: <K extends keyof SimulationState>(key: K, value: SimulationState[K]) => void;

}

export const useSimulationStore = create<SimulationState>((set) => ({
  paused: false,
  speed: 1,
  set: (key, value) => set((state) => ({ ...state, [key]: value }))
}));
