import { useRef, useState, useLayoutEffect } from "react";

export function BindPopupToViewport() {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    
      const [popupFlipped, setPopupFlipped] = useState(false);
      const [popupAlignedRight, setPopupAlignedRight] = useState(false);
      const [open, setOpen] = useState(false);

      useLayoutEffect(() => {
        const popupEl = popupRef.current!;
        const buttonEl = buttonRef.current!;
        const popupRect = popupEl.getBoundingClientRect();
        const buttonRect = buttonEl.getBoundingClientRect();
    
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
    
        // Should we flip vertically?
        const wouldOverflowBottom =
          buttonRect.bottom + popupRect.height > viewportHeight;
        const wouldOverflowTop = buttonRect.top - popupRect.height < 0;
    
        if (wouldOverflowBottom && !wouldOverflowTop) {
          setPopupFlipped(true); // show above
        } else {
          setPopupFlipped(false); // show below
        }
    
        // Should we align to right edge?
        const wouldOverflowRight =
          buttonRect.left + popupRect.width > viewportWidth;
        const wouldOverflowLeft = buttonRect.right - popupRect.width < 0;
    
        if (wouldOverflowRight && !wouldOverflowLeft) {
          setPopupAlignedRight(true);
        } else {
          setPopupAlignedRight(false);
        }
      }, [open]);
    
}