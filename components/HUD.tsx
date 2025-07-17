// components/HUD.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";

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
    content: (value: string) => <p>🌍 {value}</p>,
    defaultValue: "Earth",
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
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
            className={`cursor-move bg-black/70 rounded-xl px-4 py-2 w-36 text-white text-sm font-mono shadow-lg border border-white/10 ${
              dragging === item.id ? "opacity-40" : ""
            }`}
            draggable
            onDragStart={() => onDragStart(item.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(item.id)}
          >
            <p className="font-bold text-xs mb-1 text-white/70 uppercase tracking-wide">
              {item.title}
            </p>
            <div>{item.content(item.defaultValue)}</div>
          </motion.div>
        );
      })}
    </div>
  );
}
