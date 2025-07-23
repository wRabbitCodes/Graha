import { SettingsState } from '@/grahaEngine/core/Scene';
import dayjs from 'dayjs';
import { create } from 'zustand';

export const useSettingsStore = create<SettingsState>((set) => ({
  cameraSpeed: 1,
  mouseSensitivity: 0.001,
  boundingBox: false,
  highlightOrbit: false,
  latchedEntityID: undefined,
  entityMap: undefined,
  enableAsteroidDustCloud: true,
  enableAsteroidModels: false,
  showEntityLabel: true,
  startSim: dayjs(),
  set: (key, value) => set((state) => ({ ...state, [key]: value })),
}));
