import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { ListRowCard } from "../../components/ui/list-row-card";
import { PressableScale } from "../../components/ui/pressable-scale";

export default function ResidentServices() {
  const router = useRouter();

  const amenitiesQuery = trpc.amenities.listForResident.useQuery();
  const duesQuery = trpc.dues.mine.useQuery();
  const complaintsQuery = trpc.complaints.mine.useQuery();
  const directoryQuery = trpc.staffDirectory.listForResident.useQuery();

  const pendingDuesCount = (duesQuery.data ?? []).filter((d) => d.status !== "paid").length;
  const openTicketsCount = (complaintsQuery.data ?? []).filter((c) => c.status === "open" || c.status === "in_progress").length;

  const TILES: {
    label: string;
    description: string;
    icon: React.ComponentProps<typeof MaterialIcons>["name"];
    tint: string;
    iconColor: string;
    route: "/(resident)/amenities" | "/(resident)/dues" | "/(resident)/helpdesk" | "/(resident)/staff-directory";
  }[] = [
    {
      label: "Book Amenities",
      description: `${amenitiesQuery.data?.length ?? "—"} facilities available`,
      icon: "event",
      tint: "bg-surface-container",
      iconColor: "#F5821F",
      route: "/(resident)/amenities",
    },
    {
      label: "Maintenance Dues",
      description: pendingDuesCount > 0 ? `${pendingDuesCount} due${pendingDuesCount === 1 ? "" : "s"} pending` : "All paid up",
      icon: "payments",
      tint: "bg-secondary-container/30",
      iconColor: "#845400",
      route: "/(resident)/dues",
    },
    {
      label: "Help Desk",
      description: openTicketsCount > 0 ? `${openTicketsCount} open ticket${openTicketsCount === 1 ? "" : "s"}` : "No open tickets",
      icon: "support-agent",
      tint: "bg-secondary-container/30",
      iconColor: "#845400",
      route: "/(resident)/helpdesk",
    },
    {
      label: "Society Directory",
      description: `${directoryQuery.data?.length ?? "—"} staff & service providers`,
      icon: "contacts",
      tint: "bg-surface-container",
      iconColor: "#F5821F",
      route: "/(resident)/staff-directory",
    },
  ];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Services" role="resident" />
      <ScrollView
        contentContainerClassName="gap-3 p-4 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={amenitiesQuery.isRefetching || duesQuery.isRefetching || complaintsQuery.isRefetching || directoryQuery.isRefetching}
            onRefresh={() => {
              amenitiesQuery.refetch();
              duesQuery.refetch();
              complaintsQuery.refetch();
              directoryQuery.refetch();
            }}
          />
        }
      >
        <Text className="text-body-sm text-text-muted">Everything about society management.</Text>

        {TILES.map((tile) => (
          <PressableScale key={tile.label} scaleTo={0.98} onPress={() => router.push(tile.route)}>
            <ListRowCard className="flex-row items-center gap-4">
              <View className={`h-12 w-12 items-center justify-center rounded-full ${tile.tint}`}>
                <MaterialIcons name={tile.icon} size={22} color={tile.iconColor} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-body-md font-bold text-on-surface">{tile.label}</Text>
                <Text className="text-body-sm text-text-muted">{tile.description}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#6E6E6E" />
            </ListRowCard>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}
