import { View, Text, ScrollView } from "react-native";
import { useAuthStore } from "../../stores/auth-store";
import { Card } from "../../components/ui/card";

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="gap-4 pb-8">
      <View className="gap-1 bg-white px-4 pb-4 pt-6">
        <Text className="text-2xl font-bold text-slate-900">
          Welcome{user ? `, ${user.fullName.split(" ")[0]}` : ""}
        </Text>
        <Text className="text-base text-slate-500">Society operations at a glance.</Text>
      </View>

      <View className="flex-row flex-wrap gap-4 px-4">
        {[
          { label: "Flats occupied", value: "—" },
          { label: "Open complaints", value: "—" },
          { label: "Pending dues", value: "—" },
          { label: "Visitors today", value: "—" },
        ].map((stat) => (
          <Card key={stat.label} className="min-w-[45%] flex-1 gap-1">
            <Text className="text-2xl font-bold text-slate-900">{stat.value}</Text>
            <Text className="text-sm text-slate-500">{stat.label}</Text>
          </Card>
        ))}
      </View>

      <View className="px-4">
        <Card>
          <Text className="text-center text-sm text-slate-500">
            Live metrics land in Phase 6 (Society Admin Dashboard).
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}
