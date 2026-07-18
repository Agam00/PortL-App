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

  // management_hub mockup: white cards, icon squircle, ↗, two lavender stat chips
  // with the category's accent color on the numbers.
  const sections: {
    label: string;
    icon: React.ComponentProps<typeof MaterialIcons>["name"];
    accent: string;
    items: { label: string; value: string; route: string }[];
  }[] = [
    {
      label: "Infrastructure",
      icon: "apartment",
      accent: "#F5821F",
      items: [
        { label: "Towers", value: `${towersQuery.data?.length ?? "—"}`, route: "/(admin)/towers" },
        { label: "Flats", value: `${flatsQuery.data?.length ?? "—"}`, route: "/(admin)/flats" },
      ],
    },
    {
      label: "People",
      icon: "groups",
      accent: "#E19613",
      items: [
        { label: "Residents", value: `${residentsQuery.data?.length ?? "—"}`, route: "/(admin)/residents" },
        { label: "Guards", value: `${guardsQuery.data?.length ?? "—"}`, route: "/(admin)/guards" },
      ],
    },
    {
      label: "Communications",
      icon: "campaign",
      accent: "#AA6700",
      items: [
        { label: "Active Notices", value: `${noticesQuery.data?.length ?? "—"}`, route: "/(admin)/notices" },
        { label: "Open Polls", value: `${pollsQuery.data?.filter((p) => !p.isClosed).length ?? "—"}`, route: "/(admin)/polls" },
      ],
    },
    {
      label: "Operations",
      icon: "gavel",
      accent: "#C99A5A",
      items: [
        { label: "Amenities", value: `${amenitiesQuery.data?.length ?? "—"}`, route: "/(admin)/amenities" },
        { label: "Support Staff", value: `${staffQuery.data?.length ?? "—"}`, route: "/(admin)/staff" },
      ],
    },
    {
      label: "Finance",
      icon: "payments",
      accent: "#BA1A1A",
      items: [
        { label: "Dues Pending", value: `${duesQuery.data?.filter((d) => d.status !== "paid").length ?? "—"}`, route: "/(admin)/dues" },
      ],
    },
  ];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Management Hub" subtitle="Oversee and manage all aspects of your community." role="admin" />
      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-8 pt-2"
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
        {sections.map((section) => (
          <View key={section.label} className="gap-3 bg-surface p-5" style={[{ borderRadius: 16 }, shadowCard]}>
            <View className="flex-row items-start justify-between">
              <View
                className="h-12 w-12 items-center justify-center bg-surface-container-high"
                style={{ borderRadius: 12 }}
              >
                <MaterialIcons name={section.icon} size={24} color={section.accent} />
              </View>
              <MaterialIcons name="north-east" size={20} color="#6E6E6E" />
            </View>
            <Text className="text-headline-md font-extrabold text-on-surface">{section.label}</Text>

            <View className="flex-row gap-3">
              {section.items.map((item) => (
                <PressableScale key={item.label} scaleTo={0.97} className="flex-1" onPress={() => router.push(item.route as never)}>
                  <View className="gap-1 p-3" style={{ borderRadius: 12, backgroundColor: "#1F1F1F" }}>
                    <Text className="text-label-sm text-text-muted">{item.label}</Text>
                    <Text className="text-headline-md font-extrabold" style={{ color: section.accent }}>
                      {item.value}
                    </Text>
                  </View>
                </PressableScale>
              ))}
            </View>
          </View>
        ))}

        <View className="gap-2 pt-2">
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
      </ScrollView>
    </View>
  );
}
