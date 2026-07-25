import { View, Text, ScrollView, RefreshControl, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { AdminHeader } from "../../components/ui/admin-header";

export default function AdminSociety() {
  const router = useRouter();

  const towersQuery = trpc.towers.list.useQuery();
  const flatsQuery = trpc.flats.list.useQuery({});
  const amenitiesQuery = trpc.amenities.list.useQuery();
  const residentsQuery = trpc.admin.listResidents.useQuery();
  const guardsQuery = trpc.admin.listGuards.useQuery();
  const staffQuery = trpc.staffDirectory.list.useQuery();
  const duesQuery = trpc.dues.list.useQuery();

  const count = (n: number | undefined) => (n === undefined ? "—" : `${n}`);
  const guardsActive = guardsQuery.data ? guardsQuery.data.filter((g) => g.isActive).length : undefined;
  const duesPending = duesQuery.data ? duesQuery.data.filter((d) => d.status !== "paid").length : undefined;

  // Management-hub launcher: a single card of nav rows, matching the Stitch mockup.
  const rows: {
    label: string;
    subtitle: string;
    icon: React.ComponentProps<typeof MaterialIcons>["name"];
    route: string;
  }[] = [
    { label: "Towers & Blocks", subtitle: "structure of the society", icon: "apartment", route: "/(admin)/towers" },
    { label: "Flats", subtitle: `${count(flatsQuery.data?.length)} units and occupancy`, icon: "meeting-room", route: "/(admin)/flats" },
    { label: "Residents", subtitle: `${count(residentsQuery.data?.length)} members`, icon: "groups", route: "/(admin)/residents" },
    { label: "Guards", subtitle: `${count(guardsActive)} on the security team`, icon: "shield", route: "/(admin)/guards" },
    { label: "Staff Directory", subtitle: "maids, plumbers, services", icon: "engineering", route: "/(admin)/staff" },
    { label: "Amenities", subtitle: `${count(amenitiesQuery.data?.length)} bookable facilities`, icon: "pool", route: "/(admin)/amenities" },
    { label: "Maintenance Dues", subtitle: `${count(duesPending)} pending · billing`, icon: "receipt-long", route: "/(admin)/dues" },
  ];

  const refetchAll = () => {
    towersQuery.refetch();
    flatsQuery.refetch();
    amenitiesQuery.refetch();
    residentsQuery.refetch();
    guardsQuery.refetch();
    staffQuery.refetch();
    duesQuery.refetch();
  };

  return (
    <View className="flex-1 bg-background">
      <AdminHeader barTitle="Portl" centerBar bigTitle="Management" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl tintColor="#F5821F" colors={["#F5821F"]} progressBackgroundColor="#1A1A1A"
            refreshing={
              towersQuery.isRefetching ||
              flatsQuery.isRefetching ||
              amenitiesQuery.isRefetching ||
              residentsQuery.isRefetching ||
              guardsQuery.isRefetching ||
              staffQuery.isRefetching ||
              duesQuery.isRefetching
            }
            onRefresh={refetchAll}
          />
        }
      >
        <View
          style={{
            backgroundColor: "#1A1A1A",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "#333333",
            overflow: "hidden",
          }}
        >
          {rows.map((row, index) => (
            <Pressable
              key={row.label}
              onPress={() => router.push(row.route as never)}
              android_ripple={{ color: "#242424" }}
              className="flex-row items-center gap-4"
              style={{
                padding: 20,
                borderTopWidth: index > 0 ? 1 : 0,
                borderTopColor: "#333333",
              }}
              accessibilityRole="button"
              accessibilityLabel={row.label}
            >
              <View
                className="items-center justify-center"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: "#242424",
                  borderWidth: 1,
                  borderColor: "#333333",
                }}
              >
                <MaterialIcons name={row.icon} size={22} color="#F5821F" />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-section-header font-bold text-on-surface" numberOfLines={1}>
                  {row.label}
                </Text>
                <Text className="mt-0.5 text-body-sm text-text-muted" numberOfLines={1}>
                  {row.subtitle}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#8A8A8A" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
