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
      <View className="h-14 w-14 items-center justify-center rounded-full bg-surface-container">
        <MaterialIcons name={icon} size={26} color="#F5821F" />
      </View>
      <Text className="text-center text-body-md font-bold text-on-surface">{title}</Text>
      {description && (
        <Text className="text-center text-body-sm text-text-muted">{description}</Text>
      )}
    </View>
  );
}
