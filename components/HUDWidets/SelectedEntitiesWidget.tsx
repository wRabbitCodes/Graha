"use client";

import grahaEvents, { GRAHA_ENGINE_EVENTS } from "@/grahaEngine/utils/EventManager";
import { useEffect, useState } from "react";
import { clsx } from "clsx";

type SelectedEntitiesWidgetProps = {
  id: string;
  title: string;
  props: string[];
};

export default function SelectedEntitiesWidget({
  id,
  title,
  props: initialEntities,
}: SelectedEntitiesWidgetProps) {
  const [entities, setEntities] = useState<string[]>(initialEntities);

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

  // Format entities as a comma-separated string
  const displayText = entities.length > 0 ? entities.join(", ") : "No entities selected";

  return (
    <div className="flex flex-col w-full h-full">
      <div className="font-bold truncate">{title}</div>
      <div className="flex-1 overflow-hidden whitespace-nowrap w-[120px]">
        <div
          className={clsx(
            "inline-block",
            displayText.length > 15 && "animate-marquee"
          )}
        >
          {displayText}
        </div>
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
        .animate-marquee {
          animation: marquee 10s linear infinite;
          display: inline-block;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}