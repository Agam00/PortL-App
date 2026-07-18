import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { ListRowCard } from "../../components/ui/list-row-card";
import { PressableScale } from "../../components/ui/pressable-scale";

export default function ResidentSocial() {
  const router = useRouter();

  const noticesQuery = trpc.notices.listForResident.useQuery({});
  const pollsQuery = trpc.polls.listForResident.useQuery();

  const unreadNoticesCount = (noticesQuery.data ?? []).filter((n) => !n.isRead).length;
  const activePollsCount = (pollsQuery.data ?? []).filter((p) => !p.isClosed).length;

  const TILES: {
    label: string;
    description: string;
    icon: React.ComponentProps<typeof MaterialIcons>["name"];
    tint: string;
    iconColor: string;
    route: "/(resident)/notices" | "/(resident)/polls";
  }[] = [
    {
      label: "Notice Board",
      description: unreadNoticesCount > 0 ? `${unreadNoticesCount} unread notice${unreadNoticesCount === 1 ? "" : "s"}` : "You're all caught up",
      icon: "campaign",
      tint: "bg-surface-container",
      iconColor: "#F5821F",
      route: "/(resident)/notices",
    },
    {
      label: "Community Polls",
      description: activePollsCount > 0 ? `${activePollsCount} active poll${activePollsCount === 1 ? "" : "s"}` : "No active polls",
      icon: "how-to-vote",
      tint: "bg-secondary-container/30",
      iconColor: "#845400",
      route: "/(resident)/polls",
    },
  ];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Social" role="resident" />
      <ScrollView
        contentContainerClassName="gap-3 p-4 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={noticesQuery.isRefetching || pollsQuery.isRefetching}
            onRefresh={() => {
              noticesQuery.refetch();
              pollsQuery.refetch();
            }}
          />
        }
      >
        <Text className="text-body-sm text-text-muted">Everything about your community.</Text>

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
