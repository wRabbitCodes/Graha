import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import SelectedEntitiesWidget from "./HUDWidets/SelectedEntitiesWidget";

enum HUD_ELEMENTS {
  DOCK = "DOCK",
  SIDEBAR = "SIDEBAR",
  DASH = "DASH"
}

export type Widget = {
  id: string;
  title: string;
  preview: (value: any) => React.ReactNode;
  component?: React.ComponentType<{
    id: string;
    title: string;
    props: any[];
  }>;
};
// Example widgets
const availableWidgets: Widget[] = [
  { id: "speed", title: "Speed", preview: (v: any) => `${v} km/s` },
  { id: "distance", title: "Distance", preview: (v: any) => `${v} km` },
  { id: "3asef", title: "Distance", preview: (v: any) => `${v} km` },
  { id: "asdf", title: "Distance", preview: (v: any) => `${v} km` },
  { id: "sdf", title: "Distance", preview: (v: any) => `${v} km` },
  { id: "mc", title: "Distance", preview: (v: any) => `${v} km` },
  { id: "sd3f", title: "Distance", preview: (v: any) => `${v} km` },
  { id: "msdfsdc", title: "Distance", preview: (v: any) => `${v} km` },
  { id: "sdszf", title: "Distance", preview: (v: any) => `${v} km` },
  { id: "sddf", title: "Distance", preview: (v: any) => `${v} km` },

  {
    id: "selectedEntities",
    title: "Selected Entities",
    preview: (v: string[]) => v.join(", "),
    component: SelectedEntitiesWidget,
  },
];

const widgetPreviewValues: Record<string, any> = {
  speed: 42,
  distance: 384400,
  selectedEntities: ["Shows Selected Entities"],
};

type DragData = {
  id: string;
  source: HUD_ELEMENTS;
};

export default function HUD() {
  const [dockWidgets, setDockWidgets] = useState<Widget[]>([]);
  const [sidebarWidgets, setSidebarWidgets] =
    useState<Widget[]>(availableWidgets);
  const [draggingWidget, setDraggingWidget] = useState<DragData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  const [hoverDockIndex, setHoverDockIndex] = useState<number | null>(null);
  const [hoverSidebarIndex, setHoverSidebarIndex] = useState<number | null>(
    null
  );

  const [isDockHovered, setIsDockHovered] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const sidebarHoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const dockHoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);


  // DRAG START 

  const onDragStart = (
    e: React.DragEvent,
    id: string,
    source: HUD_ELEMENTS,
  ) => {
    setDraggingWidget({ id, source });
    e.dataTransfer.setData("application/widget-id", id);
    e.dataTransfer.setData("application/widget-source", source);
    e.dataTransfer.effectAllowed = "move";
  };

  // ---

  // DRAG OVER HANDLERS

  const onSidebarDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isSidebarHovered) setIsSidebarHovered(true);
    if (sidebarHoverTimeout.current) {
      clearTimeout(sidebarHoverTimeout.current);
      sidebarHoverTimeout.current = null;
    }

    const sidebarRect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY;
    const relativeY = mouseY - sidebarRect.top;

    const widgetHeight = 60; // Approx height per sidebar item
    const index = Math.floor(relativeY / widgetHeight) - 1;
    setHoverSidebarIndex(Math.min(index, sidebarWidgets.length));
  };

    const onDockDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDockHovered) setIsDockHovered(true);
    if (dockHoverTimeout.current) {
      clearTimeout(dockHoverTimeout.current);
      dockHoverTimeout.current = null;
    }
   
    const dockRect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX;
    const relativeX = mouseX - dockRect.left;

    const widgetWidth = 170; // same as your widget width
    const index = Math.floor(relativeX / widgetWidth);

    setHoverDockIndex(Math.min(index, dockWidgets.length - 1));
  };

  // ---

  // DRAG ENTER HANDLER

  const onSidebarDragEnter = () => setIsSidebarHovered(true);

  const onDockDragEnter = () => setIsDockHovered(true);

  // ---

  // DRAG LEAVE HANDLER

  const onSidebarDragLeave = () => {
    sidebarHoverTimeout.current = setTimeout(() => {
      setIsSidebarHovered(false);
    }, 50); // Delay helps avoid flicker
    setHoverSidebarIndex(null);
  };

  const onDockDragLeave = () => {
    dockHoverTimeout.current = setTimeout(() => {
      setIsDockHovered(false);
    }, 50);
    setHoverDockIndex(null);
  };

  // ---

  // DROP TO ELEMENTS

  const onDropToDock = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("application/widget-id");
    const source = e.dataTransfer.getData("application/widget-source") as HUD_ELEMENTS;
    const widget = availableWidgets.find((w) => w.id === id);
    if (!widget) return;

    switch(source) {
      case HUD_ELEMENTS.SIDEBAR:
        setSidebarWidgets((prev) => prev.filter((w) => w.id !== id));
        setDockWidgets((prev) => [...prev, widget]);
        break;

      case HUD_ELEMENTS.DOCK:
        setDockWidgets((prev) => {
          const newWidgets = prev.filter((w) => w.id !== id);
          newWidgets.splice(hoverDockIndex ?? newWidgets.length, 0, widget);
          return newWidgets;
        });
        break;
      }
    setDraggingWidget(null);
  };

  const onDropToSidebar = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("application/widget-id");
    const source = e.dataTransfer.getData("application/widget-source") as HUD_ELEMENTS;
    const widget = availableWidgets.find((w) => w.id === id);
    if (!widget) return;

    switch(source) {
      case HUD_ELEMENTS.DOCK:
        setDockWidgets((prev) => prev.filter((w) => w.id !== id));
        setSidebarWidgets(((prev) => [...prev, widget]));
        break;
      case HUD_ELEMENTS.SIDEBAR:
        setSidebarWidgets((prev) => {
          const newWidgets = prev.filter((w) => w.id !== id);
          newWidgets.splice(hoverSidebarIndex ?? newWidgets.length, 0, widget);
          return newWidgets;
        });
        break;
    }
    setDraggingWidget(null);
  };

  // ---

  useEffect(() => {
    const handleDragEnd = () => {
      setIsSidebarHovered(false);
      setIsDockHovered(false);
      setHoverDockIndex(null);
      setHoverSidebarIndex(null);
    };

    window.addEventListener("dragend", handleDragEnd);
    window.addEventListener("drop", handleDragEnd); // just in case

    return () => {
      window.removeEventListener("dragend", handleDragEnd);
      window.removeEventListener("drop", handleDragEnd);
    };
  }, []);

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
          "fixed top-1/2 -translate-y-1/2 z-50 rounded-full p-2 text-white hover:bg-gray-600 flex items-center justify-center",
          sidebarOpen ? "left-60 ml-1" : "left-0"
        )}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
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
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={clsx(
          "scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent fixed top-0 left-0 bottom-0 w-60 p-4 bg-black/40 backdrop-blur-md border-r border-gray-700 overflow-y-auto select-none z-50",
          isSidebarHovered
            ? "ring-2 ring-pink-500/60 shadow-[0_0_10px_2px_rgba(255,0,200,0.4)]"
            : ""
        )}
        onDrop={onDropToSidebar}
        onDragOver={onSidebarDragOver}
        onDragEnter={onSidebarDragEnter}
        onDragLeave={onSidebarDragLeave}
      >
        <h3 className="mb-3 text-white text-lg font-semibold">Widgets</h3>
        {sidebarWidgets.length === 0 && (
          <p className="text-gray-400 text-sm">No available widgets</p>
        )}
        <AnimatePresence>
          {sidebarWidgets.map((widget, index) => {
            const isDragging = draggingWidget?.id === widget.id;
            const isHovered =
              hoverSidebarIndex === index &&
              draggingWidget?.source === HUD_ELEMENTS.SIDEBAR;
            return (
              <motion.div
                key={widget.id}
                draggable
                onDragStart={(e: any) => onDragStart(e, widget.id, HUD_ELEMENTS.SIDEBAR)}
                className={clsx(
                  "mb-2 cursor-grab rounded-xl px-3 py-2 text-sm font-mono shadow-lg border border-white/10 gap-1",
                  isDragging
                    ? "bg-gray-600/50 text-white/30"
                    : "bg-black/70 text-white hover:bg-gray-700",
                  isHovered ? "ring-2 ring-gray-400" : ""
                )}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                whileDrag={{ scale: 1.05, opacity: 0.8, rotate: 2 }}
              >
                <div className="font-bold">{widget.title}</div>
                <div className="font-thin text-white/40">
                  {widget.preview(widgetPreviewValues[widget.id])}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Dock Container (centered container) */}
      <div className="fixed  bottom-4 left-0 right-0 flex justify-center pointer-events-none z-50">
        {/* Actual Dock */}
        <motion.div
          ref={dockRef}
          className={clsx(
            "p-2 bg-black/40 backdrop-blur-md border border-gray-700 flex flex-row gap-2 select-none",
            dockWidgets.length === 0 ? "rounded-full" : "rounded-xl",
            "max-w-[50vw] overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent pointer-events-auto px-2",
            isDockHovered
              ? "ring-2 ring-pink-500/60 shadow-[0_0_10px_2px_rgba(255,0,200,0.4)]"
              : ""
          )}
          onDrop={onDropToDock}
          onDragOver={onDockDragOver}
          onDragEnter={onDockDragEnter}
          onDragLeave={onDockDragLeave}
          layout
          layoutDependency={dockWidgets.length}
          transition={{
            type: "spring",
            stiffness: 600,
            damping: 25,
            mass: 0.5,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <AnimatePresence mode="popLayout">
            {dockWidgets.map((widget, index) => {
              const isDragging = draggingWidget?.id === widget.id;
              const isHovered =
                hoverDockIndex === index && draggingWidget?.source === HUD_ELEMENTS.DOCK;
              return (
                <motion.div
                  key={widget.id}
                  draggable
                  onDragStart={(e: any) => onDragStart(e, widget.id, HUD_ELEMENTS.DOCK)}
                  className={clsx(
                    "flex-shrink-0 cursor-grab rounded-xl px-3 py-2 text-sm font-mono shadow-lg border border-white/10 flex flex-col gap-1 w-[170px] h-[60px]",
                    isDragging
                      ? "bg-black/40 text-white"
                      : "bg-black/40 text-white hover:bg-gray-700",
                    isHovered && draggingWidget?.source === HUD_ELEMENTS.DOCK
                      ? "ring-2 ring-gray-400"
                      : ""
                  )}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  whileDrag={{ scale: 1.05, opacity: 0.8, rotate: 2 }}
                >
                  {widget.component ? (
                    <widget.component
                      id={widget.id}
                      title={widget.title}
                      props={widgetPreviewValues[widget.id] as string[]}
                    />
                  ) : (
                    <div className="flex flex-col">
                      <div className="font-bold">{widget.title}</div>
                      {widget.preview(widgetPreviewValues[widget.id])}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
