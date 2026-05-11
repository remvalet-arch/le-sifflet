"use client";

import { useEffect } from "react";

export function ThemeProvider() {
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "high-contrast") {
      document.documentElement.dataset.theme = saved;
    }
  }, []);
  return null;
}
