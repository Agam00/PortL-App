import { View } from "react-native";
import type { ViewProps } from "react-native";

/**
 * The list-row card shape used across every list screen in the app — same border/radius/background/padding
 * everywhere. Callers add their own layout classes (flex-row items-center, gap-2, etc.) via `className`,
 * since rows range from a simple horizontal name+actions line to a richer stacked card.
 */
export function ListRowCard({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-xl border border-border-subtle bg-surface p-4 ${className ?? ""}`}
      {...props}
    />
  );
}
