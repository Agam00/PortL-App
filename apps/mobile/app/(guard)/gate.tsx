import { View, Text, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";

export default function GuardGate() {
  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Gate" role="guard" />
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8">
        <View className="flex-row gap-4">
          <View className="flex-1 justify-center gap-1 rounded-lg border border-border-subtle bg-surface-elevated p-3">
            <Text className="text-meta-text text-text-muted">Total In</Text>
            <Text className="text-headline-lg font-semibold text-on-surface">—</Text>
          </View>
          <View className="flex-1 justify-center gap-1 rounded-lg border border-border-subtle bg-surface-elevated p-3">
            <Text className="text-meta-text text-text-muted">Total Out</Text>
            <Text className="text-headline-lg font-semibold text-on-surface">—</Text>
          </View>
        </View>

        <View className="flex-row gap-2">
          <Button className="flex-1" variant="primary" disabled>
            Scan Pass
          </Button>
          <Button className="flex-1" variant="outline" disabled>
            Manual Entry
          </Button>
        </View>

        <View className="rounded-lg border border-border-subtle bg-surface-elevated">
          <EmptyState
            title="No gate activity yet"
            description="Register a visitor and track approvals here — coming in Phase 4."
            icon="local-shipping"
          />
        </View>
      </ScrollView>
    </View>
  );
}
