import { View, Text, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenHeader } from "../../components/ui/screen-header";
import { StatusDot } from "../../components/ui/status-dot";

const STATS: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  dot?: "green" | "amber";
}[] = [
  { label: "TOTAL RESIDENTS", value: "—", icon: "group" },
  { label: "ACTIVE VISITORS", value: "—", icon: "badge", dot: "green" },
  { label: "OPEN COMPLAINTS", value: "—", icon: "report-problem", dot: "amber" },
  { label: "DUES PENDING", value: "—", icon: "payments" },
];

export default function AdminDashboard() {
  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Dashboard" role="admin" />
      <ScrollView contentContainerClassName="gap-6 p-4 pb-8">
        <View className="flex-row flex-wrap gap-3">
          {STATS.map((stat) => (
            <View
              key={stat.label}
              className="min-w-[45%] flex-1 justify-between gap-4 rounded-lg border border-border-subtle bg-surface-elevated p-4"
            >
              <View className="flex-row items-start justify-between">
                <Text className="flex-1 text-meta-text uppercase tracking-wider text-text-muted">
                  {stat.label}
                </Text>
                <MaterialIcons name={stat.icon} size={18} color="#8A8F98" />
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-headline-lg font-medium text-on-surface">{stat.value}</Text>
                {stat.dot && (
                  <View
                    className={`h-1.5 w-1.5 rounded-full ${stat.dot === "green" ? "bg-status-green" : "bg-status-amber"}`}
                  />
                )}
              </View>
            </View>
          ))}
        </View>

        <View className="gap-3">
          <Text className="text-headline-md font-semibold text-on-surface">Live Activity</Text>
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <View className="items-center gap-2 p-6">
              <Text className="text-body-sm text-text-muted">
                Live gate activity feed lands in Phase 6.
              </Text>
              <StatusDot label="Waiting on data" tone="neutral" />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
