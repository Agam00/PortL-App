import { View } from "react-native";
import { EmptyState } from "./ui/empty-state";
import { ScreenHeader } from "./ui/screen-header";

export function ComingSoonScreen({
  title,
  phase,
  role,
}: {
  title: string;
  phase: string;
  role: "resident" | "guard" | "admin";
}) {
  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title={title} role={role} />
      <EmptyState title={title} description={`Coming in ${phase}.`} icon="hourglass-empty" />
    </View>
  );
}
