"use client";

import { Toaster } from "sonner";

export function ToasterProvider() {
  return (
    <Toaster
      position="top-center"
      richColors
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
