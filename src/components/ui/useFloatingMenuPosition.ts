import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";

interface FloatingMenuOptions {
  offset?: number;
  minHeight?: number;
  maxHeight?: number;
}

export const useFloatingMenuPosition = (
  anchorRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  options: FloatingMenuOptions = {},
) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  const { offset = 8, minHeight = 96, maxHeight = 320 } = options;

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const viewportPadding = 16;
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const availableAbove = rect.top - viewportPadding;
    const placeAbove = availableBelow < minHeight && availableAbove > availableBelow;
    const availableHeight = placeAbove ? availableAbove : availableBelow;
    const resolvedMaxHeight = Math.max(
      minHeight,
      Math.min(maxHeight, Math.max(availableHeight - offset, minHeight)),
    );

    setMenuStyle({
      position: "fixed",
      left: rect.left,
      top: placeAbove ? undefined : rect.bottom + offset,
      bottom: placeAbove
        ? Math.max(viewportPadding, window.innerHeight - rect.top + offset)
        : undefined,
      width: rect.width,
      maxHeight: resolvedMaxHeight,
      zIndex: 80,
      transformOrigin: placeAbove ? "bottom center" : "top center",
    });
  }, [anchorRef, maxHeight, minHeight, offset]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuStyle(null);
      return;
    }

    updatePosition();

    const handleReposition = () => updatePosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen, updatePosition]);

  return { menuRef, menuStyle };
};
