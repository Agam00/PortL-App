import { View } from "react-native";
import type { ViewProps } from "react-native";
import { shadowCard } from "../../lib/shadows";

/** The inline create/edit form container toggled open on every admin CRUD screen. */
export function FormPanel({ className, style, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`gap-3 bg-surface-container p-5 ${className ?? ""}`}
      style={[{ borderRadius: 16 }, shadowCard, style]}
      {...props}
    />
  );
}
