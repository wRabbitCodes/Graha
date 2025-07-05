import { create } from 'zustand';

export interface SettingsState {
  globalSceneScale: number;
  cameraSpeed: number;
  mouseSensitivity: number;
  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

export const useSettings = create<SettingsState>((set) => ({
  globalSceneScale: 10,
  cameraSpeed: 1,
  mouseSensitivity: 0.001,
  set: (key, value) => set((state) => ({ ...state, [key]: value })),
}));
