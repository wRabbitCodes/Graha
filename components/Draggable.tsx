"use client";
import React, { useRef, useState, useEffect } from "react";

type DraggableProps = {
  children: React.ReactNode;
  defaultPosition?: { x: number; y: number };
  className?: string;
};

export default function Draggable({
  children,
  defaultPosition = { x: 100, y: 100 },
  className = "",
}: DraggableProps) {
  const [position, setPosition] = useState(defaultPosition);
  const draggingRef = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const selfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !selfRef.current) return;

      const elem = selfRef.current;
      const elemRect = elem.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const newX = e.clientX - offset.current.x;
      const newY = e.clientY - offset.current.y;

      // Clamp to viewport
      const maxX = viewportWidth - elemRect.width;
      const maxY = viewportHeight - elemRect.height;

      const clampedX = Math.max(0, Math.min(newX, maxX));
      const clampedY = Math.max(0, Math.min(newY, maxY));

      setPosition({ x: clampedX, y: clampedY });
      hasMoved.current = true;
    };

    const stopDrag = () => {
      draggingRef.current = false;
    };

    const handleClick = (e: MouseEvent) => {
      if (hasMoved.current) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        hasMoved.current = false;
      }
    };

    window.addEventListener("click", handleClick, { capture: true });
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDrag);

    return () => {
      window.removeEventListener("click", handleClick, { capture: true });
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    // Only start drag if clicked on handle
    if (!(e.target as HTMLElement).closest(".drag-handle")) return;

    draggingRef.current = true;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    offset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  return (
    <div
      ref={selfRef}
      className={`absolute z-50 ${className}`}
      style={{ left: position.x, top: position.y, cursor: "grab" }}
      onMouseDown={startDrag}
    >
      {children}
    </div>
  );
}
