import { View } from "react-native";
import type { ViewProps } from "react-native";

/** The inline create/edit form container toggled open on every admin CRUD screen — identical everywhere. */
export function FormPanel({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`gap-3 rounded-lg border border-border-subtle bg-surface p-4 ${className ?? ""}`}
      {...props}
    />
  );
}
