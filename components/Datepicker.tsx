"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarIcon } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";
import Draggable from "./Draggable";

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

export default function SimpleDatePicker() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(new Date(e.target.value));
    setOpen(false);
  };

  return (
    <Draggable>
    <div ref={ref} className="relative inline-block text-left">
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex items-center justify-between w-40 px-4 py-2 text-sm font-mono",
          "bg-black/30 text-white/80 rounded-xl border border-white/10 shadow-md",
          "hover:bg-white/5 transition backdrop-blur-md"
        )}
      >
        <span>{formatDate(selectedDate)}</span>
        <CalendarIcon className="w-4 h-4 text-white/60" />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          className="absolute mt-2 z-50 bg-black/80 text-white rounded-xl shadow-lg border border-white/10 p-2"
        >
          <input
            type="date"
            value={formatDate(selectedDate)}
            onChange={handleDateChange}
            className="bg-transparent text-white font-mono border border-white/20 rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-white/30"
          />
        </motion.div>
      )}
    </div>
    </Draggable>
  );
}
