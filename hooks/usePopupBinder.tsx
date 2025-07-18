// hooks/usePopupBinder.ts
import { useState, useLayoutEffect, RefObject } from "react";

export function usePopupBinder(
  open: boolean,
  buttonRef: RefObject<HTMLButtonElement | null>,
  popupRef: RefObject<HTMLDivElement | null>
) {
  const [popupFlipped, setPopupFlipped] = useState(false);
  const [popupAlignedRight, setPopupAlignedRight] = useState(false);

  useLayoutEffect(() => {
    debugger;
    if (!open) {
      setPopupFlipped(false);
      setPopupAlignedRight(false);
      return;
    }

    const popupEl = popupRef.current;
    const buttonEl = buttonRef.current;

    if (!popupEl || !buttonEl) {
      console.warn("Popup or button element not found:", { popupEl, buttonEl });
      return;
    }

    const popupRect = popupEl.getBoundingClientRect();
    const buttonRect = buttonEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const wouldOverflowBottom = buttonRect.bottom + popupRect.height > viewportHeight;
    const wouldOverflowTop = buttonRect.top - popupRect.height < 0;
    const wouldOverflowRight = buttonRect.left + popupRect.width > viewportWidth;
    const wouldOverflowLeft = buttonRect.right - popupRect.width < 0;

    setPopupFlipped(wouldOverflowBottom && !wouldOverflowTop);
    setPopupAlignedRight(wouldOverflowRight && !wouldOverflowLeft);
  }, [open, buttonRef, popupRef]); // Include refs in dependencies

  return [popupFlipped, popupAlignedRight] as const;
}