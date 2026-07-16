import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { PressableScale } from "../../components/ui/pressable-scale";
import { Button } from "../../components/ui/button";
import { shadowCard } from "../../lib/shadows";

export default function AdminSociety() {
  const router = useRouter();

  const towersQuery = trpc.towers.list.useQuery();
  const flatsQuery = trpc.flats.list.useQuery({});
  const amenitiesQuery = trpc.amenities.list.useQuery();
  const residentsQuery = trpc.admin.listResidents.useQuery();
  const guardsQuery = trpc.admin.listGuards.useQuery();
  const staffQuery = trpc.staffDirectory.list.useQuery();
  const noticesQuery = trpc.notices.list.useQuery();
  const pollsQuery = trpc.polls.list.useQuery();
  const duesQuery = trpc.dues.list.useQuery();

  const sections: {
    label: string;
    icon: React.ComponentProps<typeof MaterialIcons>["name"];
    tint: string;
    iconColor: string;
    items: { label: string; value: string; route: string }[];
  }[] = [
    {
      label: "Infrastructure",
      icon: "apartment",
      tint: "bg-surface-container",
      iconColor: "#6244CD",
      items: [
        { label: "Towers", value: `${towersQuery.data?.length ?? "—"}`, route: "/(admin)/towers" },
        { label: "Flats", value: `${flatsQuery.data?.length ?? "—"}`, route: "/(admin)/flats" },
      ],
    },
    {
      label: "People",
      icon: "groups",
      tint: "bg-secondary-container/30",
      iconColor: "#845400",
      items: [
        { label: "Residents", value: `${residentsQuery.data?.length ?? "—"}`, route: "/(admin)/residents" },
        { label: "Guards", value: `${guardsQuery.data?.length ?? "—"}`, route: "/(admin)/guards" },
      ],
    },
    {
      label: "Communications",
      icon: "campaign",
      tint: "bg-secondary-container/30",
      iconColor: "#845400",
      items: [
        { label: "Active Notices", value: `${noticesQuery.data?.length ?? "—"}`, route: "/(admin)/notices" },
        { label: "Open Polls", value: `${pollsQuery.data?.filter((p) => !p.isClosed).length ?? "—"}`, route: "/(admin)/polls" },
      ],
    },
    {
      label: "Operations",
      icon: "build",
      tint: "bg-surface-container",
      iconColor: "#6244CD",
      items: [
        { label: "Amenities", value: `${amenitiesQuery.data?.length ?? "—"}`, route: "/(admin)/amenities" },
        { label: "Support Staff", value: `${staffQuery.data?.length ?? "—"}`, route: "/(admin)/staff" },
      ],
    },
    {
      label: "Finance",
      icon: "payments",
      tint: "bg-status-red/15",
      iconColor: "#BA1A1A",
      items: [
        { label: "Dues Pending", value: `${duesQuery.data?.filter((d) => d.status !== "paid").length ?? "—"}`, route: "/(admin)/dues" },
      ],
    },
  ];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Management Hub" role="admin" />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={
              towersQuery.isRefetching ||
              flatsQuery.isRefetching ||
              amenitiesQuery.isRefetching ||
              residentsQuery.isRefetching ||
              guardsQuery.isRefetching ||
              staffQuery.isRefetching ||
              noticesQuery.isRefetching ||
              pollsQuery.isRefetching ||
              duesQuery.isRefetching
            }
            onRefresh={() => {
              towersQuery.refetch();
              flatsQuery.refetch();
              amenitiesQuery.refetch();
              residentsQuery.refetch();
              guardsQuery.refetch();
              staffQuery.refetch();
              noticesQuery.refetch();
              pollsQuery.refetch();
              duesQuery.refetch();
            }}
          />
        }
      >
        <Text className="text-body-sm text-text-muted">Oversee and manage all aspects of your community.</Text>

        {sections.map((section) => (
          <View key={section.label} className="gap-3 rounded-card bg-surface p-5" style={shadowCard}>
            <View className="flex-row items-center justify-between">
              <View className={`h-11 w-11 items-center justify-center rounded-full ${section.tint}`}>
                <MaterialIcons name={section.icon} size={20} color={section.iconColor} />
              </View>
              <MaterialIcons name="north-east" size={18} color="#CAC4D6" />
            </View>
            <Text className="text-headline-md font-extrabold text-on-surface">{section.label}</Text>

            <View className={`flex-row gap-3 ${section.items.length === 1 ? "" : ""}`}>
              {section.items.map((item) => (
                <PressableScale key={item.label} scaleTo={0.97} className="flex-1" onPress={() => router.push(item.route as never)}>
                  <View className="gap-1 rounded-md bg-surface-container p-3">
                    <Text className="text-label-sm text-text-muted">{item.label}</Text>
                    <Text className="text-headline-md font-extrabold text-primary-container">{item.value}</Text>
                  </View>
                </PressableScale>
              ))}
            </View>
          </View>
        ))}

        <View className="gap-2">
          <Text className="text-label-caps uppercase text-text-muted">Quick Actions</Text>
          <View className="flex-row gap-3">
            <Button className="flex-1" variant="primary" onPress={() => router.push("/(admin)/notices")}>
              + New Notice
            </Button>
            <Button className="flex-1" variant="outline" onPress={() => router.push("/(admin)/residents")}>
              Add Resident
            </Button>
          </View>
        </View>

        <PressableScale onPress={() => router.push("/(admin)/more")}>
          <View className="flex-row items-center gap-3 rounded-card bg-surface p-4" style={shadowCard}>
            <MaterialIcons name="account-circle" size={22} color="#797585" />
            <Text className="flex-1 text-body-md font-bold text-on-surface">My Profile</Text>
            <MaterialIcons name="chevron-right" size={20} color="#CAC4D6" />
          </View>
        </PressableScale>
      </ScrollView>
    </View>
  );
}
