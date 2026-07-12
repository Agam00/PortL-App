import { View, Text } from "react-native";
import { RoleBadge } from "./role-badge";

export function ScreenHeader({ title, role }: { title: string; role: string }) {
  return (
    <View className="flex-row items-center justify-between border-b border-border-subtle bg-background px-4 py-4">
      <Text className="text-headline-lg font-semibold text-on-surface">{title}</Text>
      <RoleBadge role={role} />
    </View>
  );
}
