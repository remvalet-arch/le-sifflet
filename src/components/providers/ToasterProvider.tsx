"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

function useSafeAreaTop(): number {
  const [top, setTop] = useState(60);
  useEffect(() => {
    const el = document.createElement("div");
    el.style.cssText =
      "position:fixed;top:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none;height:0";
    document.body.appendChild(el);
    const computed = parseFloat(getComputedStyle(el).top) || 0;
    document.body.removeChild(el);
    setTimeout(() => setTop(Math.max(computed + 8, 60)), 0);
  }, []);
  return top;
}

export function ToasterProvider() {
  const offset = useSafeAreaTop();
  return (
    <Toaster
      position="top-center"
      richColors
      offset={offset}
      toastOptions={{
        style: {
          background: "#1a3a23",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#f8fafc",
        },
      }}
    />
  );
}
