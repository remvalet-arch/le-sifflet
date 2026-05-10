import posthog from "posthog-js";

const CONSENT_KEY = "vartime_analytics_consent";
type ConsentStatus = "granted" | "denied" | "pending";

export function getConsentStatus(): ConsentStatus {
  if (typeof window === "undefined") return "pending";
  const v = localStorage.getItem(CONSENT_KEY);
  if (v === "granted" || v === "denied") return v;
  return "pending";
}

export function grantConsent() {
  localStorage.setItem(CONSENT_KEY, "granted");
  posthog.opt_in_capturing();
}

export function denyConsent() {
  localStorage.setItem(CONSENT_KEY, "denied");
  posthog.opt_out_capturing();
}

export function restoreConsent() {
  const status = getConsentStatus();
  if (status === "granted") posthog.opt_in_capturing();
}
