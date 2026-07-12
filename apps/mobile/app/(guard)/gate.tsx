import { View, Text, ScrollView } from "react-native";
import { useAuthStore } from "../../stores/auth-store";
import { Card } from "../../components/ui/card";
import { SectionHeader } from "../../components/ui/section-header";
import { EmptyState } from "../../components/ui/empty-state";

export default function GuardGate() {
  const user = useAuthStore((s) => s.user);

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="gap-4 pb-8">
      <View className="gap-1 bg-white px-4 pb-4 pt-6">
        <Text className="text-2xl font-bold text-slate-900">
          {user ? user.fullName.split(" ")[0] : "Guard"}'s Gate
        </Text>
        <Text className="text-base text-slate-500">Today's activity at the gate.</Text>
      </View>

      <SectionHeader title="Live queue" />
      <View className="px-4">
        <Card>
          <EmptyState
            title="Nothing to show yet"
            description="Register a visitor and track approvals here — coming in Phase 4."
          />
        </Card>
      </View>
    </ScrollView>
  );
}
