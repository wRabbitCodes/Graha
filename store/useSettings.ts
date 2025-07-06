import { SettingsState } from '@/grahaEngine/core/Scene';
import { create } from 'zustand';

export const useSettings = create<SettingsState>((set) => ({
  globalSceneScale: 10,
  cameraSpeed: 1,
  mouseSensitivity: 0.001,
  boundingBox: false,
  highlightOrbit: false,
  latchedEntityID: undefined,
  entityMap: undefined,
  set: (key, value) => set((state) => ({ ...state, [key]: value })),
}));
