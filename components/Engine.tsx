"use client";

import { useEffect, useRef, useState } from "react";
import { Scene } from "@/grahaEngine/core/Scene";
import { TEXTURES, FONTS } from "@/grahaEngine/data/assetsData";
import Controls from "./Controls";
import { useSettings } from "@/store/useSettings";

export default function Engine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingDone, setLoadingDone] = useState(false);
  const [showCrosshair, setShowCrosshair] = useState(false);

  const settings = useSettings();

  // Initialize scene and load assets
  useEffect(() => {
    if (!canvasRef.current) return;
    const sceneInstance = new Scene(canvasRef.current);
    sceneRef.current = sceneInstance;
    const loader = sceneInstance.assetsLoader;

    loader
      .loadAll({
        textures: TEXTURES,
        fonts: FONTS,
      })
      .then(() => {
        sceneInstance.initialize();
        setLoadingDone(true);
        requestAnimationFrame(animate);
        settings.set("entityMap", sceneRef.current!.getNamedEntities());
      });

    const animate = () => {
      requestAnimationFrame(animate);
      sceneInstance.update(16); // replace with actual deltaTime if needed
    };

    // Poll for loading progress
    const interval = setInterval(() => {
      const progress = loader.getProgress();
      setLoadingProgress(progress);
      if (progress >= 1) clearInterval(interval);
    }, 100);

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === canvasRef.current;
      setShowCrosshair(locked);
    };

    document.addEventListener("pointerlockchange", handlePointerLockChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener(
        "pointerlockchange",
        handlePointerLockChange
      );
    };
  }, []);

  // Update scene settings reactively
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.updateSettings({
      globalSceneScale: settings.globalSceneScale,
      cameraSpeed: settings.cameraSpeed,
      mouseSensitivity: settings.mouseSensitivity,
      boundingBox: settings.boundingBox,
      highlightOrbit: settings.highlightOrbit,
      latchedEntityID: settings.latchedEntityID,
      set: settings.set,
      // Add more settings if needed
    });
  }, [settings.boundingBox, settings.cameraSpeed, settings.mouseSensitivity, settings.boundingBox, settings.highlightOrbit, settings.latchedEntityID]);

  return (
    <div className="relative w-full h-full">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        id="glCanvas"
        className="absolute inset-0 w-full h-full block z-0 bg-black"
      />

      {/* Crosshair */}
      {showCrosshair && (
        <div
          id="crosshair"
          className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-cyan-400 text-2xl font-orbitron z-50 pointer-events-none"
        >
          ⌖
        </div>
      )}

      {/* Loading Screen */}
      {!loadingDone && (
        <div
          id="loading-screen"
          className="fixed top-0 left-0 w-screen h-screen bg-black text-white flex flex-col items-center justify-center z-[9999]"
        >
          <div id="loading-text" className="mb-4 text-xl font-orbitron">
            Loading... {(loadingProgress * 100).toFixed(0)}%
          </div>
          <progress
            id="loading-progress"
            max={1}
            value={loadingProgress}
            className="w-4/5 h-4"
          />
        </div>
      )}

      <Controls />
    </div>
  );
}
