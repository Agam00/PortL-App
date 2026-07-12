import { View, ActivityIndicator, Text } from "react-native";

export function LoadingScreen({ label }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background">
      <ActivityIndicator size="large" color="#5e6ad2" />
      {label && <Text className="text-body-sm text-text-muted">{label}</Text>}
    </View>
  );
}
