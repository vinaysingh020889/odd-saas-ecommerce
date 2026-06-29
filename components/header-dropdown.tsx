"use client";

import { useEffect, useRef, type ReactNode } from "react";

type HeaderDropdownProps = {
  label: string;
  children: ReactNode;
};

export function HeaderDropdown({ label, children }: HeaderDropdownProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      const details = detailsRef.current;
      if (!details?.open) return;
      if (event.target instanceof Node && details.contains(event.target)) return;
      details.open = false;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && detailsRef.current?.open) {
        detailsRef.current.open = false;
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <details ref={detailsRef} className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-full px-2 py-2 hover:text-omd-saffron">
        {label}
        <span className="text-[10px]" aria-hidden="true">v</span>
      </summary>
      {children}
    </details>
  );
}
