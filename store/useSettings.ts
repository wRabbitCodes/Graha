import { SettingsState } from '@/grahaEngine/core/Scene';
import dayjs from 'dayjs';
import { create } from 'zustand';

export const useSettings = create<SettingsState>((set) => ({
  globalSceneScale: 10,
  cameraSpeed: 1,
  mouseSensitivity: 0.001,
  boundingBox: false,
  highlightOrbit: false,
  latchedEntityID: undefined,
  entityMap: undefined,
  enableAsteroidDustCloud: true,
  enableAsteroidModels: false,
  showEntityLabel: true,
  startSim: dayjs("2000-01-01T12:00:00Z"),
  set: (key, value) => set((state) => ({ ...state, [key]: value })),
}));
