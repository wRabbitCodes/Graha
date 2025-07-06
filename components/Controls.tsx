import { useState } from "react";
import { useSettings } from "@/store/useSettings";
import { Settings2 } from "lucide-react"; // optional: install `lucide-react` for icons

export default function Controls() {
  const [open, setOpen] = useState(false);
  const {
    globalSceneScale,
    cameraSpeed,
    mouseSensitivity,
    boundingBox,
    highlightOrbit,
    latchedPlanet,
    set,
  } = useSettings();

  return (
    <div className="absolute bottom-4 left-4 z-50">
      <button
        className="p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition"
        onClick={() => setOpen(!open)}
        aria-label="Settings"
      >
        <Settings2 className="w-6 h-6" />
      </button>

      {open && (
        <div className="mt-2 w-72 p-4 bg-black/80 text-white rounded-xl shadow-xl backdrop-blur-md space-y-4">
          <div>
            <label className="block text-sm mb-1">Global Scene Scale</label>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={globalSceneScale}
              onChange={(e) => set("globalSceneScale", Number(e.target.value))}
              className="w-full"
            />
            <span className="text-xs">{globalSceneScale}</span>
          </div>

          <div>
            <label className="block text-sm mb-1">Camera Speed</label>
            <input
              type="number"
              value={cameraSpeed}
              step={0.1}
              onChange={(e) => set("cameraSpeed", Number(e.target.value))}
              className="w-full bg-gray-800 p-1 rounded"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Mouse Sensitivity</label>
            <input
              type="number"
              step={0.0001}
              value={mouseSensitivity}
              onChange={(e) => set("mouseSensitivity", Number(e.target.value))}
              className="w-full bg-gray-800 p-1 rounded"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="boundingBox"
              checked={boundingBox}
              onChange={(e) => set("boundingBox", e.target.checked)}
              className="w-4 h-4 accent-cyan-400"
            />
            <label htmlFor="boundingBox" className="text-sm select-none">
              Show Bounding Boxes
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="highlightOrbit"
              checked={highlightOrbit}
              onChange={(e) => set("highlightOrbit", e.target.checked)}
              className="w-4 h-4 accent-cyan-400"
            />
            <label htmlFor="highlightOrbit" className="text-sm select-none">
              Highlight Orbit
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
