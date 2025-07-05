"use client";
import { useEffect, useRef, useState } from "react";
import { Scene } from "@/grahaEngine/core/Scene";
import { TEXTURES, FONTS } from "@/grahaEngine/data/assetsData";

export default function WebGLCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingDone, setLoadingDone] = useState(false);
  const [showCrosshair, setShowCrosshair] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const scene = new Scene(canvasRef.current);
    const loader = scene.assetsLoader;

    loader.loadAll({
      textures: TEXTURES,
      fonts: FONTS,
    }).then(() => {
      scene.initialize();
      setLoadingDone(true);
      animate();
    });

    // Progress polling
    const interval = setInterval(() => {
      const progress = loader.getProgress();
      setLoadingProgress(progress);
      if (progress >= 1) clearInterval(interval);
    }, 100);

    const animate = () => {
      requestAnimationFrame(animate);
      const delta = 16; // You can use real deltaTime
      scene.update(delta);
    };

    // Crosshair visibility based on pointer lock
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === canvasRef.current;
      setShowCrosshair(locked);
    };

    document.addEventListener("pointerlockchange", handlePointerLockChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
    };
  }, []);

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

      {/* Optional debug HUD */}
      <div className="absolute top-2 left-2 text-white text-sm z-20 pointer-events-none">
        Hello, WebGL!
      </div>
    </div>
  );
}
