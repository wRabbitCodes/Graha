"use client";

import { usePopupBinder } from "@/hooks/usePopupBinder";
import React, { ReactNode, useRef } from "react";

type PopupBinderProps = {
  open: boolean;
  toggle: (args: {
    ref: React.RefObject<HTMLButtonElement | null>;
  }) => ReactNode;
  popup: (args: {
    ref: React.RefObject<HTMLDivElement | null>;
    flipped: boolean;
    alignedRight: boolean;
  }) => ReactNode;
};

export function PopupBinder({ open, toggle, popup }: PopupBinderProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [flipped, alignedRight] = usePopupBinder(open, buttonRef, popupRef);

  return (
    <div className="relative inline-block">
      {toggle && toggle({ ref: buttonRef })}
      {open && popup &&
        popup({
          ref: popupRef,
          flipped,
          alignedRight,
        })}
    </div>
  );
}
