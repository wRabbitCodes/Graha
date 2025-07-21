"use client";

import grahaEvents, {
  GRAHA_ENGINE_EVENTS,
} from "@/grahaEngine/utils/EventManager";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import React from "react";
import { HUD_ELEMENTS } from "../HUD";
import { PlanetChatbox } from "./PlanetChatbox";

type SelectedEntitiesProps = {
  id: string;
  title: string;
  props: string[];
  location: HUD_ELEMENTS;
};

export default React.memo(function SelectedEntities({
  id,
  title,
  props: initialEntities,
  location,
}: SelectedEntitiesProps) {
  const [entities, setEntities] = useState<string[]>(initialEntities);

  // Listen to grahaEvents for selected entities updates
  useEffect(() => {
    const handleEntitiesChange = ({ names }: { names: string[] }) => {
      setEntities(names);
    };
    grahaEvents.on(GRAHA_ENGINE_EVENTS.SELECTED_ENTITIES, handleEntitiesChange);
    return () => {
      grahaEvents.off(
        GRAHA_ENGINE_EVENTS.SELECTED_ENTITIES,
        handleEntitiesChange
      );
    };
  }, []);

  // Format entities as a comma-separated string
  const displayText =
    entities.length > 0 ? entities.join(", ") : "No entities selected";

  switch (location) {
    case HUD_ELEMENTS.DOCK:
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
    case HUD_ELEMENTS.DETAILS:
      return (
        <div className="flex flex-col w-full h-full p-2">
          <div className="text-lg font-bold mb-2">{title}</div>
          <div className="text-sm mb-2 text-gray-700">
            Selected Entities: {displayText}
          </div>
          <PlanetChatbox />
        </div>
      );
  }
});
