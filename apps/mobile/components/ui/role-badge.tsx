import { View, Text } from "react-native";

const ROLE_LABEL: Record<string, string> = {
  resident: "RESIDENT",
  guard: "GUARD",
  admin: "ADMIN",
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <View className="rounded border border-border-subtle bg-surface-elevated px-2 py-1">
      <Text className="text-label-caps uppercase tracking-wide text-on-surface-variant">
        {ROLE_LABEL[role] ?? role}
      </Text>
    </View>
  );
}
