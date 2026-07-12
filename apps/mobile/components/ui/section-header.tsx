import { View, Text } from "react-native";

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between px-4 py-2">
      <Text className="text-headline-md font-semibold text-on-surface">{title}</Text>
      {action}
    </View>
  );
}
