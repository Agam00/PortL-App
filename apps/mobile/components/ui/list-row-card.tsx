import { View } from "react-native";
import type { ViewProps } from "react-native";
import { shadowCard } from "../../lib/shadows";

/** The list-row card shape used across every list screen in the app. Callers add their own
 * layout classes (flex-row items-center, gap-2, etc.) via `className`. */
export function ListRowCard({ className, style, ...props }: ViewProps & { className?: string }) {
  return (
    <View className={`rounded-card bg-surface p-4 ${className ?? ""}`} style={[shadowCard, style]} {...props} />
  );
}
