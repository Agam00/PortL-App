import { View, Text } from "react-native";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-2 px-8 py-16">
      <Text className="text-center text-base font-semibold text-slate-700">{title}</Text>
      {description && (
        <Text className="text-center text-sm text-slate-500">{description}</Text>
      )}
    </View>
  );
}
