// HUD.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

// Example widgets
const availableWidgets = [
  { id: "speed", title: "Speed", content: (v: any) => `${v} km/s` },
  { id: "distance", title: "Distance", content: (v: any) => `${v} km` },
];

const defaultHudValues: Record<string, number> = {
  speed: 42,
  distance: 384400,
};

type Widget = {
  id: string;
  title: string;
  content: (value: any) => React.ReactNode;
};

type DragData = {
  id: string;
  source: "dock" | "sidebar";
};

export default function HUD() {
  const [dockWidgets, setDockWidgets] = useState<Widget[]>([]);
  const [sidebarWidgets, setSidebarWidgets] = useState<Widget[]>(availableWidgets);
  const [draggingWidget, setDraggingWidget] = useState<DragData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const onDragStart = (
    e: React.DragEvent,
    id: string,
    source: "dock" | "sidebar"
  ) => {
    setDraggingWidget({ id, source });
    e.dataTransfer.setData("application/widget-id", id);
    e.dataTransfer.setData("application/widget-source", source);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDropToDock = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("application/widget-id");
    const source = e.dataTransfer.getData("application/widget-source") as
      | "dock"
      | "sidebar";
    const widget = availableWidgets.find((w) => w.id === id);
    if (!widget) return;

    if (source === "sidebar") {
      setSidebarWidgets((prev) => prev.filter((w) => w.id !== id));
      setDockWidgets((prev) => [...prev, widget]);
    } else if (source === "dock") {
      // Rearranging within dock (optional)
    }
    setDraggingWidget(null);
  };

  const onDropToSidebar = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("application/widget-id");
    const source = e.dataTransfer.getData("application/widget-source") as
      | "dock"
      | "sidebar";
    const widget = availableWidgets.find((w) => w.id === id);
    if (!widget) return;

    if (source === "dock") {
      setDockWidgets((prev) => prev.filter((w) => w.id !== id));
      setSidebarWidgets((prev) => [...prev, widget]);
    }
    setDraggingWidget(null);
  };

  return (
    <>
      {/* Sidebar toggle button */}
      <motion.button
        layout
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label={
          sidebarOpen ? "Close widgets sidebar" : "Open widgets sidebar"
        }
        className={clsx(
          "fixed top-1/2 -translate-y-1/2 z-60 p-2 bg-black/60 text-white rounded-full backdrop-blur-md border border-gray-700 hover:bg-gray-700 flex items-center justify-center",
          sidebarOpen ? "left-60 ml-1" : "left-0"
        )}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-6 h-6" />
        ) : (
          <ChevronRight className="w-6 h-6" />
        )}
      </motion.button>

      {/* Side panel */}
      <motion.div
        layout
        initial={false}
        animate={{ x: sidebarOpen ? 0 : -240 }}
        transition={{ type: "spring", stiffness: 250, damping: 30 }}
        className="fixed top-0 left-0 bottom-0 w-60 p-4 bg-black/80 backdrop-blur-md border-r border-gray-700 overflow-y-auto select-none z-50"
        onDrop={onDropToSidebar}
        onDragOver={onDragOver}
      >
        <h3 className="mb-3 text-white text-lg font-semibold">Widgets</h3>
        {sidebarWidgets.length === 0 && (
          <p className="text-gray-400 text-sm">No available widgets</p>
        )}
        {sidebarWidgets.map((widget) => {
          const isDragging = draggingWidget?.id === widget.id;
          return (
            <div
              key={widget.id}
              draggable
              onDragStart={(e) => onDragStart(e, widget.id, "sidebar")}
              className={clsx(
                "mb-2 cursor-grab rounded-xl px-3 py-2 text-sm font-mono shadow-lg border border-white/10 flex flex-col gap-1",
                isDragging
                  ? "bg-gray-600/50 text-white/30"
                  : "bg-black/70 text-white hover:bg-gray-700"
              )}
            >
              <div className="font-bold">{widget.title}</div>
              <div>{widget.content(defaultHudValues[widget.id])}</div>
            </div>
          );
        })}
      </motion.div>

      {/* Dock */}
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 p-2 bg-black/80 backdrop-blur-md border border-gray-700 rounded-xl flex gap-2 select-none z-50"
        onDrop={onDropToDock}
        onDragOver={onDragOver}
      >
        {dockWidgets.map((widget) => {
          const isDragging = draggingWidget?.id === widget.id;
          return (
            <div
              key={widget.id}
              draggable
              onDragStart={(e) => onDragStart(e, widget.id, "dock")}
              className={clsx(
                "cursor-grab rounded-xl px-3 py-2 text-sm font-mono shadow-lg border border-white/10 flex flex-col gap-1",
                isDragging
                  ? "bg-gray-600/50 text-white/30"
                  : "bg-black/70 text-white hover:bg-gray-700"
              )}
            >
              <div className="font-bold">{widget.title}</div>
              <div>{widget.content(defaultHudValues[widget.id])}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
