"use client";

import { useState, useEffect } from "react";

const INTERVAL_MS = 4000;

type Props = {
  messages: string[];
  defaultMessage: string;
};

export function useRotatingPlaceholder({
  messages,
  defaultMessage,
}: Props): string {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (messages.length === 0) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % messages.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [messages]);

  return messages.length > 0
    ? (messages[idx] ?? defaultMessage)
    : defaultMessage;
}
