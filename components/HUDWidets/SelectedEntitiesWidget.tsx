"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, Variants } from "framer-motion";
import { clsx } from "clsx";
import grahaEvents, { GRAHA_ENGINE_EVENTS } from "@/grahaEngine/utils/EventManager";

type SelectedEntitiesWidgetProps = {
  id: string;
  title: string;
  props: string[];
};

// Marquee animation variants
const marqueeVariants: Variants = {
  animate: (width: number) => ({
    x: [0, -width],
    transition: {
      repeat: Infinity,
      repeatType: "loop",
      duration: width / 100,
      ease: "linear",
    },
  }),
  static: {
    x: 0,
    transition: {
      duration: 0,
    },
  },
};

export default function SelectedEntitiesWidget({
  id,
  title,
  props: initialEntities,
}: SelectedEntitiesWidgetProps) {
  const [entities, setEntities] = useState<string[]>(initialEntities);
  const textRef = useRef<HTMLDivElement>(null);
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Listen to grahaEvents for selected entities updates
  useEffect(() => {
    const handleEntitiesChange = ({ names }: { names: string[] }) => {
      setEntities(names);
    };
    grahaEvents.on(GRAHA_ENGINE_EVENTS.SELECTED_ENTITIES, handleEntitiesChange);
    return () => {
      grahaEvents.off(GRAHA_ENGINE_EVENTS.SELECTED_ENTITIES, handleEntitiesChange);
    };
  }, []);

  // Measure text and container width for marquee effect after layout stabilizes
  useEffect(() => {
    const measure = () => {
      if (textRef.current && textRef.current.parentElement) {
        const textRect = textRef.current.getBoundingClientRect();
        const containerRect = textRef.current.parentElement.getBoundingClientRect();
        setTextWidth(textRect.width);
        setContainerWidth(containerRect.width);
      }
    };
    // Delay measurement to avoid layout animation interference
    const timer = setTimeout(measure, 100);
    return () => clearTimeout(timer);
  }, [entities]);

  // Format entities as a comma-separated string
  const displayText = entities.length > 0 ? entities.join(", ") : "No entities selected";

  // Determine if marquee is needed (text overflows container)
  const needsMarquee = textWidth > containerWidth;

  return (
    <div className="flex flex-col w-full h-full">
      <div className="font-bold truncate">{title}</div>
      <div className="flex-1 overflow-hidden whitespace-nowrap w-[120px]">
        <motion.div
          ref={textRef}
          variants={marqueeVariants}
          animate={needsMarquee ? "animate" : "static"}
          custom={textWidth}
          className="inline-block"
        >
          {displayText}
        </motion.div>
      </div>
    </div>
  );
}