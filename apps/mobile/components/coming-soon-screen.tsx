import { View } from "react-native";
import { EmptyState } from "./ui/empty-state";

export function ComingSoonScreen({ title, phase }: { title: string; phase: string }) {
  return (
    <View className="flex-1 bg-white">
      <EmptyState title={title} description={`Coming in ${phase}.`} />
    </View>
  );
}
