import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export function EmptyState({
  title,
  description,
  icon = "inbox",
}: {
  title: string;
  description?: string;
  icon?: React.ComponentProps<typeof MaterialIcons>["name"];
}) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-8 py-16">
      <View className="h-12 w-12 items-center justify-center rounded-full border border-border-subtle bg-surface-elevated">
        <MaterialIcons name={icon} size={22} color="#8A8F98" />
      </View>
      <Text className="text-center text-body-md font-medium text-on-surface">{title}</Text>
      {description && (
        <Text className="text-center text-body-sm text-text-muted">{description}</Text>
      )}
    </View>
  );
}
