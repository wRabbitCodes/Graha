"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import dayjs from "dayjs";
import clsx from "clsx";
import Draggable from "./Draggable";

export default function DatePicker() {
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [open, setOpen] = useState(false);

  const startOfMonth = currentMonth.startOf("month");
  const endOfMonth = currentMonth.endOf("month");
  const daysInMonth = endOfMonth.date();
  const startDay = startOfMonth.day();

  const weeks: Array<Array<dayjs.Dayjs | null>> = [];
  let dayCounter = 1 - startDay;

  for (let week = 0; week < 6; week++) {
    const days: Array<dayjs.Dayjs | null> = [];
    for (let d = 0; d < 7; d++) {
      if (dayCounter < 1 || dayCounter > daysInMonth) {
        days.push(null);
      } else {
        days.push(currentMonth.date(dayCounter));
      }
      dayCounter++;
    }
    weeks.push(days);
  }

  const toggleOpen = () => setOpen(!open);

  return (
    <Draggable>
    <div className="relative inline-block">
      <button
        onClick={toggleOpen}
        className="drag-handle flex items-center gap-2 px-3 text-white text-sm py-2 rounded-md shadow-lg border border-white/10 font-mon text-white bg-black/70 hover:bg-gray-700"
      >
        <CalendarIcon className="w-4 h-4" />
        {selectedDate ? selectedDate.format("DD MMM YYYY") : "Pick a date"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.2 }}
            className="relative z-50 mt-2 p-4 rounded-xl bg-black/80 text-white shadow-lg border border-gray-700"
          >
            <div className="flex justify-between items-center mb-2">
              <button onClick={() => setCurrentMonth(currentMonth.subtract(1, "month"))}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-semibold">{currentMonth.format("MMMM YYYY")}</span>
              <button onClick={() => setCurrentMonth(currentMonth.add(1, "month"))}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 text-sm text-gray-400 mb-1">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div key={d} className="text-center">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {weeks.flat().map((date, idx) => (
                <div key={idx} className="text-center">
                  {date ? (
                    <button
                      onClick={() => {
                        setSelectedDate(date);
                        setOpen(false);
                      }}
                      className={clsx(
                        "w-8 h-8 rounded-full hover:bg-blue-600 transition",
                        selectedDate?.isSame(date, "day") && "bg-blue-500"
                      )}
                    >
                      {date.date()}
                    </button>
                  ) : (
                    <span className="w-8 h-8 inline-block" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </Draggable>
  );
}
