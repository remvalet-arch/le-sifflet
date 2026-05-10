"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { useSmartMuteTracker } from "@/hooks/useSmartMuteTracker";

interface Props {
  userId: string;
  signupDate: string;
}

export function PostHogIdentify({ userId, signupDate }: Props) {
  useSmartMuteTracker();

  useEffect(() => {
    if (posthog.has_opted_in_capturing()) {
      posthog.identify(userId, {
        signup_date: signupDate,
      });
    }
  }, [userId, signupDate]);

  return null;
}
