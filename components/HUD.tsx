import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import SelectedEntitiesWidget from "./HUDWidets/SelectedEntities";

export enum HUD_ELEMENTS {
  DOCK = "DOCK",
  SIDEBAR = "SIDEBAR",
  DETAILS = "DETAILS",
}

export type Widget = {
  id: string;
  title: string;
  preview: (value: any) => React.ReactNode;
  component?: React.ComponentType<{
    id: string;
    title: string;
    props: any[];
    location: HUD_ELEMENTS;
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
  const [detailsWidget, setDetailsWidget] = useState<Widget | null>(null);
  const [hoverDockIndex, setHoverDockIndex] = useState<number | null>(null);
  const [hoverSidebarIndex, setHoverSidebarIndex] = useState<number | null>(
    null
  );

  const [isDockHovered, setIsDockHovered] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isDetailsHovered, setIsDetailsHovered] = useState(false);

  const sidebarHoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const dockHoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailsHoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // DRAG START

  const onDragStart = useCallback(
    (e: React.DragEvent, id: string, source: HUD_ELEMENTS) => {
      setDraggingWidget({ id, source });
      e.dataTransfer.setData("application/widget-id", id);
      e.dataTransfer.setData("application/widget-source", source);
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  // ---

  // DRAG OVER HANDLERS
  const widgetHeight = 68; // Approx height per sidebar item
  const widgetWidth = 178; // same as your widget width

  const onSidebarDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!isSidebarHovered) setIsSidebarHovered(true);
      if (sidebarHoverTimeout.current) {
        clearTimeout(sidebarHoverTimeout.current);
        sidebarHoverTimeout.current = null;
      }

      const sidebarRect = e.currentTarget.getBoundingClientRect();
      const mouseY = e.clientY;
      const relativeY = mouseY - sidebarRect.top;

      const index = Math.floor(relativeY / widgetHeight) - 1;
      setHoverSidebarIndex(Math.min(Math.max(index, 0), sidebarWidgets.length));
    },
    [widgetHeight]
  );

  const onDockDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!isDockHovered) setIsDockHovered(true);
      if (dockHoverTimeout.current) {
        clearTimeout(dockHoverTimeout.current);
        dockHoverTimeout.current = null;
      }

      const dockRect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX;
      const relativeX = mouseX - dockRect.left;

      const index = Math.floor(relativeX / widgetWidth);

      setHoverDockIndex(Math.min(Math.max(index, 0), dockWidgets.length));
    },
    [widgetWidth]
  );

  const onDetailsDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isDetailsHovered) setIsDetailsHovered(true);
    if (detailsHoverTimeout.current) {
        clearTimeout(detailsHoverTimeout.current);
        detailsHoverTimeout.current = null;
    }
  }, []);
  // ---

  // DRAG ENTER HANDLER

  const onSidebarDragEnter = () => setIsSidebarHovered(true);

  const onDockDragEnter = () => setIsDockHovered(true);
  
  const onDetailsDragEnter = () => setIsDetailsHovered(true);
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

  const onDetailsDragLeave = () => {
    detailsHoverTimeout.current = setTimeout(() => {
      setIsDetailsHovered(false);
    }, 50);
  }

  // ---

  // DROP TO ELEMENTS

  const onDropToDock = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("application/widget-id");
      const source = e.dataTransfer.getData(
        "application/widget-source"
      ) as HUD_ELEMENTS;
      const widget = availableWidgets.find((w) => w.id === id);
      if (!widget) return;

      switch (source) {
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
    },
    [hoverDockIndex, availableWidgets]
  );

  const onDropToSidebar = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("application/widget-id");
      const source = e.dataTransfer.getData(
        "application/widget-source"
      ) as HUD_ELEMENTS;
      const widget = availableWidgets.find((w) => w.id === id);
      if (!widget) return;

      switch (source) {
        case HUD_ELEMENTS.DOCK:
          setDockWidgets((prev) => prev.filter((w) => w.id !== id));
          setSidebarWidgets((prev) => [...prev, widget]);
          break;
        case HUD_ELEMENTS.SIDEBAR:
          setSidebarWidgets((prev) => {
            const newWidgets = prev.filter((w) => w.id !== id);
            newWidgets.splice(
              hoverSidebarIndex ?? newWidgets.length,
              0,
              widget
            );
            return newWidgets;
          });
          break;
      }
      setDraggingWidget(null);
    },
    [hoverSidebarIndex, availableWidgets]
  );

  const onDropToDetails = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (detailsWidget) return; // prevent multiple widgets

      const id = e.dataTransfer.getData("application/widget-id");
      const source = e.dataTransfer.getData(
        "application/widget-source"
      ) as HUD_ELEMENTS;
      const widget = availableWidgets.find((w) => w.id === id);
      if (!widget) return;

      // remove from source panel
      if (source === HUD_ELEMENTS.DOCK) {
        setDockWidgets((prev) => prev.filter((w) => w.id !== id));
      } else if (source === HUD_ELEMENTS.SIDEBAR) {
        setSidebarWidgets((prev) => prev.filter((w) => w.id !== id));
      } 
      setDetailsWidget(widget);
      setDraggingWidget(null);
      if (detailsHoverTimeout.current) {
        clearTimeout(detailsHoverTimeout.current);
        detailsHoverTimeout.current = null;
      }
    },
    [detailsWidget]
  );
  // ---

  useEffect(() => {
    const handleDragEnd = () => {
      setIsSidebarHovered(false);
      setIsDockHovered(false);
      setIsDetailsHovered(false)
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
            return (
              <motion.div
                key={widget.id}
                draggable
                onDragStart={(e: any) =>
                  onDragStart(e, widget.id, HUD_ELEMENTS.SIDEBAR)
                }
                className={clsx(
                  "mb-2 cursor-grab rounded-xl px-3 py-2 text-sm font-mono shadow-lg border border-white/10 gap-1",
                  isDragging
                    ? "bg-gray-600/50 text-white/30"
                    : "bg-black/70 text-white hover:bg-gray-700",
                  hoverSidebarIndex === index ? "ring-2 ring-gray-400" : ""
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
      {/* -------------------- */}

      {/* Details Panel */}
      <motion.div
        layout
        initial={false}
        animate={{ x: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={clsx(
          "scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent fixed top-0 right-0 bottom-0 w-60 bg-black/40 backdrop-blur-md border-l border-gray-700 overflow-y-auto select-none z-50",
          isDetailsHovered || detailsWidget
            ? "ring-2 ring-blue-500/60 shadow-[0_0_10px_2px_rgba(0,0,255,0.4)]"
            : ""
        )}
        onDrop={onDropToDetails}
        onDragOver={onDetailsDragOver}
        onDragEnter={onDetailsDragEnter}
        onDragLeave={onDetailsDragLeave}
      >
        <h3 className="mb-3 text-white text-lg font-semibold">Details</h3>
        <AnimatePresence>
          {detailsWidget ? (
            <motion.div
              key={detailsWidget.id}
              className={clsx(
                "relative mb-2 rounded-xl py-2 text-sm font-mono shadow-lg border border-white/10",
                "bg-black/80 text-white"
              )}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              whileDrag={{ scale: 1.05, opacity: 0.8, rotate: 2 }}
            >
              <button
                onClick={() => {
                  setSidebarWidgets((prev) => [...prev, detailsWidget]);
                  setDetailsWidget(null)
                }}
                className="absolute top-1 right-1 text-xs text-white bg-gray-700 hover:bg-gray-600 rounded px-2 py-1"
              >
                ×
              </button>
              <div className="font-bold">{detailsWidget.title}</div>
              <div className="font-thin text-white/40">
                 {detailsWidget.component ? (
                    <detailsWidget.component
                      id={detailsWidget.id}
                      title={detailsWidget.title}
                      props={widgetPreviewValues[detailsWidget.id] as string[]}
                      location={HUD_ELEMENTS.DETAILS}
                      key={detailsWidget.id} // Ensure unique key for component
                    />
                  ) : (
                    <div className="flex flex-col">
                      <div className="font-bold">{detailsWidget.title}</div>
                      {detailsWidget.preview(widgetPreviewValues[detailsWidget.id])}
                    </div>
                  )}
              </div>
            </motion.div>
          ) : (
            <p className="text-gray-400 text-sm">Drop a widget here</p>
          )}
        </AnimatePresence>
      </motion.div>
      {/* -------------------- */}

      {/* Dock Container (centered container) */}
      <div className="fixed  bottom-4 left-0 right-0 flex justify-center pointer-events-none z-50">
        {/* Actual Dock */}
        <motion.div
          className={clsx(
            "p-2 bg-black/40 backdrop-blur-md border border-gray-700 flex flex-row gap-2 select-none",
            dockWidgets.length === 0 ? "rounded-full" : "rounded-xl",
            "max-w-[40vw] overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent pointer-events-auto px-2",
            isDockHovered
              ? "ring-2 ring-green-500/60 shadow-[0_0_10px_2px_rgba(0,255,0,0.4)]"
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
              return (
                <motion.div
                  key={widget.id}
                  draggable
                  onDragStart={(e: any) =>
                    onDragStart(e, widget.id, HUD_ELEMENTS.DOCK)
                  }
                  className={clsx(
                    "flex-shrink-0 cursor-grab rounded-xl px-3 py-2 text-sm font-mono shadow-lg border border-white/10 flex flex-col gap-1 w-[170px] h-[60px]",
                    isDragging
                      ? "bg-black/40 text-white"
                      : "bg-black/40 text-white hover:bg-gray-700",
                    hoverDockIndex === index ? "ring-2 ring-gray-400" : ""
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
                      location={HUD_ELEMENTS.DOCK}
                      key={widget.id} // Ensure unique key for component
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
