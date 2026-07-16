import { View } from "react-native";
import type { ViewProps } from "react-native";
import { shadowCard } from "../../lib/shadows";

/** The inline create/edit form container toggled open on every admin CRUD screen. */
export function FormPanel({ className, style, ...props }: ViewProps & { className?: string }) {
  return (
    <View className={`gap-3 rounded-card bg-surface p-5 ${className ?? ""}`} style={[shadowCard, style]} {...props} />
  );
}
