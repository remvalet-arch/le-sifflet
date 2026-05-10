"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

interface Props {
  locale: string;
}

export function LandingTracker({ locale }: Props) {
  useEffect(() => {
    track("landing_viewed", {
      locale,
      referrer: document.referrer || undefined,
    });
  }, [locale]);

  return null;
}
