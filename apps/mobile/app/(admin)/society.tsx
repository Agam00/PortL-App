import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { GroupLabel } from "../../components/ui/group-label";

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
    items: { label: string; value: string; icon: React.ComponentProps<typeof MaterialIcons>["name"]; route: string }[];
  }[] = [
    {
      label: "Infrastructure",
      items: [
        { label: "Towers", value: `${towersQuery.data?.length ?? "—"}`, icon: "business", route: "/(admin)/towers" },
        { label: "Flats", value: `${flatsQuery.data?.length ?? "—"}`, icon: "door-front", route: "/(admin)/flats" },
        { label: "Amenities", value: `${amenitiesQuery.data?.length ?? "—"}`, icon: "pool", route: "/(admin)/amenities" },
      ],
    },
    {
      label: "People",
      items: [
        { label: "Residents", value: `${residentsQuery.data?.length ?? "—"}`, icon: "group", route: "/(admin)/residents" },
        { label: "Guards", value: `${guardsQuery.data?.length ?? "—"}`, icon: "shield", route: "/(admin)/guards" },
        { label: "Staff", value: `${staffQuery.data?.length ?? "—"}`, icon: "badge", route: "/(admin)/staff" },
      ],
    },
    {
      label: "Communications",
      items: [
        {
          label: "Notices",
          value: `${noticesQuery.data?.length ?? "—"} Active`,
          icon: "campaign",
          route: "/(admin)/notices",
        },
        {
          label: "Polls",
          value: `${pollsQuery.data?.filter((p) => !p.isClosed).length ?? "—"} Active`,
          icon: "poll",
          route: "/(admin)/polls",
        },
      ],
    },
    {
      label: "Finance",
      items: [
        {
          label: "Dues",
          value: `${duesQuery.data?.filter((d) => d.status !== "paid").length ?? "—"} Pending`,
          icon: "payments",
          route: "/(admin)/dues",
        },
      ],
    },
  ];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Management Hub" role="admin" />
      <ScrollView contentContainerClassName="gap-6 p-4 pb-8">
        <Text className="text-body-sm text-text-muted">Oversee society operations, infrastructure, and communications.</Text>

        {sections.map((section) => (
          <View key={section.label} className="gap-2">
            <GroupLabel label={section.label} />
            <View className="rounded-lg border border-border-subtle bg-surface-elevated">
              {section.items.map((item, index) => (
                <Pressable
                  key={item.label}
                  onPress={() => router.push(item.route as never)}
                  className={`flex-row items-center gap-3 p-4 active:bg-white/5 ${index > 0 ? "border-t border-border-subtle" : ""}`}
                >
                  <MaterialIcons name={item.icon} size={20} color="#c6c5d5" />
                  <Text className="flex-1 text-body-md font-medium text-on-surface">{item.label}</Text>
                  <Text className="text-body-sm text-text-muted">{item.value}</Text>
                  <MaterialIcons name="chevron-right" size={18} color="#8A8F98" />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
