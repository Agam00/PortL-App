import { Text } from "react-native";

/** Small uppercase label above a grouped list section, e.g. "PENDING", "CHECKED IN". */
export function GroupLabel({ label }: { label: string }) {
  return (
    <Text className="px-1 pb-2 text-label-caps uppercase tracking-widest text-text-muted">
      {label}
    </Text>
  );
}
