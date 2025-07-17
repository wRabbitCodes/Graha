"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import grahaEvents, { GRAHA_ENGINE_EVENTS } from "@/grahaEngine/utils/EventManager"; // Adjust path

const hudItems = [
  {
    id: "speed",
    title: "Speed",
    content: (value: string) => <p>🚀 {value}</p>,
    defaultValue: "12.5 km/s",
  },
  {
    id: "distance",
    title: "Distance",
    content: (value: string) => <p>🛰️ {value}</p>,
    defaultValue: "384,400 km",
  },
  {
    id: "selected",
    title: "Selected",
    content: (values: string[]) => <div>{values.map(value => <p>🌍 {value}</p>)}</div>,
    defaultValue: ["--"],
  },
  {
    id: "system",
    title: "System",
    content: (value: string) => <p>☀️ {value}</p>,
    defaultValue: "Sol System",
  },
];

export function HUD() {
  const [order, setOrder] = useState(hudItems.map((item) => item.id));
  const [dragging, setDragging] = useState<string | null>(null);
  const [hudValues, setHudValues] = useState<Record<string, any>>(
    Object.fromEntries(hudItems.map((item) => [item.id, item.defaultValue]))
  );

  // Handle engine events → update only selected HUD fields
  useEffect(() => {
    const handleLatchedEntity = (data: { names: string[] }) => {
      setHudValues((prev) => ({
        ...prev,
        selected: data.names,
      }));
    };

    grahaEvents.on(GRAHA_ENGINE_EVENTS.SELECTED_ENTITIES, handleLatchedEntity);
    return () => {
      grahaEvents.off(GRAHA_ENGINE_EVENTS.SELECTED_ENTITIES, handleLatchedEntity);
    };
  }, []);

  const onDragStart = (id: string) => setDragging(id);

  const onDrop = (id: string) => {
    if (!dragging || dragging === id) return;
    const newOrder = [...order];
    const fromIndex = newOrder.indexOf(dragging);
    const toIndex = newOrder.indexOf(id);
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, dragging);
    setOrder(newOrder);
    setDragging(null);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-3 px-6 py-3 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
      {order.map((id) => {
        const item = hudItems.find((x) => x.id === id)!;
        return (
          <motion.div
            key={item.id}
            layout
            className={clsx(
              "cursor-move bg-black/70 rounded-xl px-4 py-2 w-36 text-white text-sm font-mono shadow-lg border border-white/10",
              dragging === item.id && "opacity-40"
            )}
            draggable
            onDragStart={() => onDragStart(item.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(item.id)}
          >
            <p className="font-bold text-xs mb-1 text-white/70 uppercase tracking-wide">
              {item.title}
            </p>
            <div>{item.content(hudValues[item.id])}</div>
          </motion.div>
        );
      })}
    </div>
  );
}
