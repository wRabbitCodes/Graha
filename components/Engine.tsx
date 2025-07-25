"use client";

import { useEffect, useRef, useState } from "react";
import { Scene } from "@/grahaEngine/core/Scene";
import { TEXTURES, FONTS, MODELS, JSON_DATA } from "@/grahaEngine/data/urls";
import Controls from "./Controls";
import { useSettingsStore } from "@/store/useSettingsStore";
import HUD from "./HUD";
import Datepicker from "./Datepicker";
import Draggable from "./Draggable";
import { useSimulationStore } from "@/store/useSimulationStore";

export default function Engine() {
  // const canvasRef = useRef<HTMLCanvasElement>(null);
  // const sceneRef = useRef<Scene | null>(null);
  // const [loadingProgress, setLoadingProgress] = useState(0);
  // const [loadingDone, setLoadingDone] = useState(false);
  // const [showCrosshair, setShowCrosshair] = useState(false);
  // const lastFrameTime = useRef(performance.now());

  // const settings = useSettingsStore();
  // const simulation = useSimulationStore();
  // const pausedRef = useRef(simulation.paused);
  // const speedRef = useRef(simulation.speed);

  // useEffect(() => {
  //   pausedRef.current = simulation.paused;
  // }, [simulation.paused]);

  // useEffect(() => {
  //   speedRef.current = simulation.speed;
  // }, [simulation.speed]);
  // // Initialize scene and load assets
  // useEffect(() => {
  //   if (!canvasRef.current) return;
  //   const sceneInstance = new Scene(canvasRef.current);
  //   sceneRef.current = sceneInstance;
  //   const loader = sceneInstance.assetsLoader;
  //   loader
  //     .loadAll({
  //       textures: TEXTURES,
  //       fonts: FONTS,
  //       // models: MODELS,
  //       json: JSON_DATA,
  //     })
  //     .then(() => {
  //       sceneInstance.initialize();
  //       setLoadingDone(true);
  //       requestAnimationFrame(animate);
  //       settings.set("entityMap", sceneRef.current!.getNamedEntities());
  //     });

  //   const animate = () => {
  //     const now = performance.now();
  //     const realDeltaTime = now - lastFrameTime.current;
  //     lastFrameTime.current = now;

  //     if (!pausedRef.current) {
  //       const simDeltaTime = realDeltaTime * speedRef.current;
  //       sceneInstance.update(simDeltaTime);
  //     }

  //     requestAnimationFrame(animate);
  //   };

  //   // Poll for loading progress
  //   const interval = setInterval(() => {
  //     const progress = loader.getProgress();
  //     setLoadingProgress(progress);
  //     if (progress >= 1) clearInterval(interval);
  //   }, 100);

  //   const handlePointerLockChange = () => {
  //     const locked = document.pointerLockElement === canvasRef.current;
  //     setShowCrosshair(locked);
  //   };

  //   document.addEventListener("pointerlockchange", handlePointerLockChange);

  //   return () => {
  //     clearInterval(interval);
  //     document.removeEventListener(
  //       "pointerlockchange",
  //       handlePointerLockChange
  //     );
  //   };
  // }, []);

  // // Update scene settings reactively
  // useEffect(() => {
  //   const scene = sceneRef.current;
  //   if (!scene) return;
  //   scene.updateSettings({
  //     cameraSpeed: settings.cameraSpeed,
  //     mouseSensitivity: settings.mouseSensitivity,
  //     boundingBox: settings.boundingBox,
  //     highlightOrbit: settings.highlightOrbit,
  //     latchedEntityID: settings.latchedEntityID,
  //     enableAsteroidDustCloud: settings.enableAsteroidDustCloud,
  //     enableAsteroidModels: settings.enableAsteroidModels,
  //     showEntityLabel: settings.showEntityLabel,
  //     startSim: settings.startSim,
  //     set: settings.set,
  //     // Add more settings if needed
  //   });
  // }, [
  //   settings.boundingBox,
  //   settings.cameraSpeed,
  //   settings.mouseSensitivity,
  //   settings.boundingBox,
  //   settings.highlightOrbit,
  //   settings.latchedEntityID,
  //   settings.enableAsteroidDustCloud,
  //   settings.enableAsteroidModels,
  //   settings.showEntityLabel,
  //   settings.startSim,
  // ]);

  return (
    
    <div className="relative w-full h-full">
      {/* HUD */}
      <HUD/>
      <Draggable defaultPosition={{ x: 100, y: 5 }}>
        <Controls />
      </Draggable>
      <Draggable defaultPosition={{ x: 150, y: 5 }}>
        <Datepicker/>
      </Draggable>
    </div>
  );
}
