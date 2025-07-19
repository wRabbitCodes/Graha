"use client";

import { useSettings } from "@/store/useSettings";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { Settings2 } from "lucide-react";
import { useState } from "react";
import { PopupBinder } from "./PopupBinder";

export default function Controls() {
  const [open, setOpen] = useState(false);

  const {
    globalSceneScale,
    cameraSpeed,
    mouseSensitivity,
    boundingBox,
    highlightOrbit,
    latchedEntityID: latchedPlanet,
    entityMap,
    enableAsteroidDustCloud,
    enableAsteroidModels,
    showEntityLabel,
    set,
  } = useSettings();

  return (
    <PopupBinder
      open={open}
      toggle={({ ref }) => (
        <button
          ref={ref}
          className="drag-handle p-2 bg-black/40 text-white rounded-full backdrop-blur-md transition border border-gray-700 hover:bg-gray-700"
          onClick={() => setOpen(!open)}
          aria-label="Settings"
        >
          <Settings2 className="w-6 h-6" />
        </button>
      )}
      popup={({ ref, flipped, alignedRight }) => (
        <AnimatePresence>
          {open && (
            <motion.div
              ref={ref}
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.2 }}
              className={clsx(
                `absolute mt-1 w-72 p-4 rounded-xl bg-black/40 text-white shadow-lg backdrop-blur-md space-y-2 border border-gray-700`,
                flipped ? "bottom-full mb-2" : "top-full mt-2",
                alignedRight ? "right-0" : "left-0"
              )}
            >
              {/* === All Controls Here === */}
              <div>
                <label className="block text-sm mb-1">Global Scene Scale</label>
                <input
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={globalSceneScale}
                  onChange={(e) =>
                    set("globalSceneScale", Number(e.target.value))
                  }
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
                  onChange={(e) =>
                    set("mouseSensitivity", Number(e.target.value))
                  }
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
                  id="enableAsteroidDustCloud"
                  checked={enableAsteroidDustCloud}
                  onChange={(e) =>
                    set("enableAsteroidDustCloud", e.target.checked)
                  }
                  className="w-4 h-4 accent-cyan-400"
                />
                <label
                  htmlFor="enableAsteroidDustCloud"
                  className="text-sm select-none"
                >
                  Show Asteroid Dust
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enableAsteroidModels"
                  checked={enableAsteroidModels}
                  onChange={(e) =>
                    set("enableAsteroidModels", e.target.checked)
                  }
                  className="w-4 h-4 accent-cyan-400"
                />
                <label
                  htmlFor="enableAsteroidModels"
                  className="text-sm select-none"
                >
                  Show Asteroid Models
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

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showEntityLabel"
                  checked={showEntityLabel}
                  onChange={(e) => set("showEntityLabel", e.target.checked)}
                  className="w-4 h-4 accent-cyan-400"
                />
                <label
                  htmlFor="showEntityLabel"
                  className="text-sm select-none"
                >
                  Show Label
                </label>
              </div>

              {entityMap && (
                <div>
                  <label className="block text-sm mb-1">Camera LockOn</label>
                  <select
                    value={latchedPlanet ?? ""}
                    onChange={(e) =>
                      set(
                        "latchedEntityID",
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value)
                      )
                    }
                    className="w-full bg-gray-800 p-1 rounded text-white"
                  >
                    {[...entityMap.entries()].map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                    <option value="">No Camera Lock</option>
                  </select>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    />
  );
}
