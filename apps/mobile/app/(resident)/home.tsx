import { View, Text, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/auth-store";
import { ScreenHeader } from "../../components/ui/screen-header";
import { EmptyState } from "../../components/ui/empty-state";

const QUICK_ACTIONS: {
  label: string;
  meta: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
}[] = [
  { label: "Pre-Approve", meta: "Generate pass", icon: "qr-code-scanner" },
  { label: "Help Desk", meta: "Raise ticket", icon: "support-agent" },
  { label: "Dues", meta: "View balance", icon: "payments" },
  { label: "Bookings", meta: "Amenities", icon: "event" },
];

export default function ResidentHome() {
  const user = useAuthStore((s) => s.user);

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Home" role="resident" />
      <ScrollView contentContainerClassName="gap-6 p-4 pb-8">
        {user && (
          <Text className="text-body-sm text-text-muted">
            Good morning, {user.fullName.split(" ")[0]}
          </Text>
        )}

        <View className="gap-3">
          <Text className="text-headline-md font-semibold text-on-surface">
            Pending Approvals
          </Text>
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState
              title="No pending requests"
              description="Visitor and delivery approvals will show up here — coming in Phase 4."
              icon="notifications-none"
            />
          </View>
        </View>

        <View className="flex-row flex-wrap gap-3">
          {QUICK_ACTIONS.map((action) => (
            <View
              key={action.label}
              className="min-w-[45%] flex-1 gap-3 rounded-lg border border-border-subtle bg-surface-elevated p-4"
            >
              <MaterialIcons name={action.icon} size={20} color="#5e6ad2" />
              <View>
                <Text className="text-body-md font-medium text-on-surface">{action.label}</Text>
                <Text className="text-meta-text text-text-muted">{action.meta}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
