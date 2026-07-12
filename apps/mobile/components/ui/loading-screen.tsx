import { View, ActivityIndicator, Text } from "react-native";

export function LoadingScreen({ label }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-white">
      <ActivityIndicator size="large" color="#0f172a" />
      {label && <Text className="text-sm text-slate-500">{label}</Text>}
    </View>
  );
}
