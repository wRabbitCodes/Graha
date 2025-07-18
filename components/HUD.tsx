"use client";

import React, { JSX, useState } from "react";
import { Reorder } from "framer-motion";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Widget {
  id: string;
  title: string;
  content:(...args:any[])=>JSX.Element;
}

const allWidgets: Widget[] = [
  {
    id: "speed",
    title: "Speed",
    content: (value: string) => <p>🚀 {value}</p>,
  },
  {
    id: "distance",
    title: "Distance",
    content: (value: string) => <p>🛰️ {value}</p>,
  },
  {
    id: "selected",
    title: "Selected",
    content: (values: string[]) => <p> {values.join(", ")}</p>,
  },
  {
    id: "system",
    title: "System",
    content: (value: string) => <p>☀️ {value}</p>,
  },
];

const defaultHudValues: Record<string, any> = {
  speed: "12.5 km/s",
  distance: "384,400 km",
  selected: ["--"],
  system: "Sol System",
};

export default function HUD() {
  const [dockWidgets, setDockWidgets] = useState<string[]>(["speed", "distance"]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sidebar widgets that are not in dock
  const sidebarWidgets = allWidgets.filter((w) => !dockWidgets.includes(w.id));

  // Native drag start on sidebar widgets (to add)
  const onDragStartSidebar = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData("widgetId", id);
    e.dataTransfer.effectAllowed = "move";
  };

  // Native drag start on dock widget remove handle (to remove from dock)
  const onDragStartRemoveHandle = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData("widgetId", id);
    e.dataTransfer.effectAllowed = "move";
  };

  // Drop on dock to add widget
  const onDropToDock = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("widgetId");
    if (id && !dockWidgets.includes(id)) {
      setDockWidgets([...dockWidgets, id]);
    }
  };

  // Drop on sidebar to remove widget from dock
  const onDropToSidebar = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("widgetId");
    if (id && dockWidgets.includes(id)) {
      setDockWidgets(dockWidgets.filter((w) => w !== id));
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <>
      {/* Sidebar toggle button */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label={sidebarOpen ? "Close widgets sidebar" : "Open widgets sidebar"}
        className={clsx(
          "fixed top-1/2 -translate-y-1/2 z-60 p-2 bg-black/60 text-white rounded-full backdrop-blur-md border border-gray-700 hover:bg-gray-700 flex items-center justify-center",
          sidebarOpen ? "left-60 ml-1" : "left-0"
        )}
      >
        {sidebarOpen ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
      </button>

      {/* Side panel */}
      <div
        className={clsx(
          "fixed top-0 left-0 bottom-0 w-60 p-4 bg-black/80 backdrop-blur-md border-r border-gray-700 overflow-y-auto select-none transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        onDrop={onDropToSidebar}
        onDragOver={onDragOver}
      >
        <h3 className="mb-3 text-white text-lg font-semibold">Widgets</h3>
        {sidebarWidgets.length === 0 && (
          <p className="text-gray-400 text-sm">No available widgets</p>
        )}
        {sidebarWidgets.map((widget) => (
          <div
            key={widget.id}
            draggable
            onDragStart={(e) => onDragStartSidebar(e, widget.id)}
            className="drag-handle mb-2 cursor-grab rounded-xl bg-black/70 px-3 py-2 text-white text-sm font-mono shadow-lg border border-white/10 hover:bg-gray-700 flex flex-col gap-1"
          >
            <div className="font-bold">{widget.title}</div>
            <div>{widget.content(defaultHudValues[widget.id])}</div>
          </div>
        ))}
      </div>

      {/* Dock */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-3 px-6 py-3 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl overflow-x-auto"
        onDrop={onDropToDock}
        onDragOver={onDragOver}
      >
        <Reorder.Group axis="x" values={dockWidgets} onReorder={setDockWidgets} className="flex gap-3">
          {dockWidgets.map((id) => {
            const widget = allWidgets.find((w) => w.id === id)!;
            return (
              <Reorder.Item
                key={widget.id}
                value={widget.id}
                dragListener={true} // enable reorder drag inside dock
                className={clsx(
                  "drag-handle cursor-grab items-center bg-black/70 rounded-xl px-4 py-2 w-36 gap-2 text-white text-sm font-mono shadow-lg border border-white/10 hover:bg-gray-700 flex flex-col select-none relative"
                )}
              >
                {/* Remove handle: small icon area for native drag to sidebar */}
                <div
                  draggable
                  onDragStart={(e) => onDragStartRemoveHandle(e, widget.id)}
                  title="Drag to sidebar to remove"
                  className="absolute top-1 right-1 w-4 h-4 cursor-grab text-gray-400 hover:text-red-400 select-none"
                >
                  ×
                </div>

                <p className="font-bold text-xs mb-1 text-white/70 uppercase tracking-wide">{widget.title}</p>
                <div>{widget.content(defaultHudValues[widget.id])}</div>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      </div>
    </>
  );
}
