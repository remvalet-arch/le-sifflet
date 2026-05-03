import { redirect } from "next/navigation";

/** Ancienne URL — les ligues vivent sur `/ligues`. */
export default function SquadsLegacyRedirect() {
  redirect("/ligues");
}
