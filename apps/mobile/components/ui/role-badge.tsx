import { View, Text } from "react-native";

const ROLE_LABEL: Record<string, string> = {
  resident: "RESIDENT",
  guard: "GUARD",
  admin: "ADMIN",
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <View className="rounded-full bg-surface-container px-3 py-1">
      <Text className="text-label-caps uppercase tracking-wide text-primary-container">
        {ROLE_LABEL[role] ?? role}
      </Text>
    </View>
  );
}
