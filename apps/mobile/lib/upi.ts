import { Platform } from "react-native";

// UPI apps we offer as direct options. "any" opens the system UPI chooser.
export type UpiApp = "gpay" | "phonepe" | "paytm" | "any";

const ANDROID_PACKAGE: Record<Exclude<UpiApp, "any">, string> = {
  gpay: "com.google.android.apps.nbu.paisa.user",
  phonepe: "com.phonepe.app",
  paytm: "net.one97.paytm",
};

export const UPI_APPS: { key: UpiApp; label: string; color: string; short: string }[] = [
  { key: "gpay", label: "Google Pay", color: "#1A73E8", short: "GPay" },
  { key: "phonepe", label: "PhonePe", color: "#5F259F", short: "Pe" },
  { key: "paytm", label: "Paytm", color: "#00BAF2", short: "Pay" },
  { key: "any", label: "Other UPI app", color: "#F5821F", short: "UPI" },
];

function qs(params: Record<string, string | undefined>): string {
  return Object.entries(params)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");
}

/**
 * Builds a UPI deep link. On Android a specific app is targeted via an intent URL;
 * "any" (and iOS) fall back to the generic `upi://pay` which shows the app chooser.
 */
export function buildUpiUrl(
  app: UpiApp,
  params: { pa: string; pn: string; am: string; tn?: string },
): string {
  const query = qs({ pa: params.pa, pn: params.pn, am: params.am, cu: "INR", tn: params.tn });

  if (Platform.OS === "android" && app !== "any") {
    return `intent://pay?${query}#Intent;scheme=upi;package=${ANDROID_PACKAGE[app]};end`;
  }
  return `upi://pay?${query}`;
}
