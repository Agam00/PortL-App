import { View, Text, ScrollView, RefreshControl } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { AdminHeader } from "../../components/ui/admin-header";
import { EmptyState } from "../../components/ui/empty-state";
import { ListLoading } from "../../components/ui/list-loading";
import { VISITOR_TYPE_LABEL } from "../../lib/visitor-status";
import type { VisitorOutput } from "@repo/services/visitor/model";

const TYPE_ICON: Record<VisitorOutput["type"], React.ComponentProps<typeof MaterialIcons>["name"]> = {
  guest: "how-to-reg",
  delivery: "local-shipping",
  cab: "directions-car",
  service: "engineering",
  other: "person",
};

const STATUS: Record<VisitorOutput["status"], { label: string; color: string }> = {
  pending: { label: "Waiting", color: "#F5821F" },
  approved: { label: "Approved", color: "#27C96D" },
  rejected: { label: "Rejected", color: "#FF5F5F" },
  expired: { label: "Expired", color: "#8A8A8A" },
  checked_in: { label: "Inside", color: "#27C96D" },
  checked_out: { label: "Exited", color: "#8A8A8A" },
  cancelled: { label: "Cancelled", color: "#8A8A8A" },
};

function time(iso: string | null) {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—";
}
function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}

export default function AdminGateLog() {
  const query = trpc.visitors.history.useQuery({});
  const logs = query.data ?? [];

  return (
    <View className="flex-1 bg-background">
      <AdminHeader showBack barTitle="Gate Log" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 12 }}
        refreshControl={
          <RefreshControl
            tintColor="#F5821F"
            colors={["#F5821F"]}
            progressBackgroundColor="#1A1A1A"
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
          />
        }
      >
        {query.isLoading ? (
          <ListLoading />
        ) : query.isError ? (
          <View style={{ borderRadius: 20, backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#333333" }}>
            <EmptyState title="Couldn't load the gate log" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : logs.length === 0 ? (
          <View style={{ borderRadius: 20, backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#333333" }}>
            <EmptyState title="No gate activity yet" description="Visitor entries and exits across the society will appear here." icon="meeting-room" />
          </View>
        ) : (
          <View style={{ backgroundColor: "#1A1A1A", borderRadius: 20, borderWidth: 1, borderColor: "#333333", overflow: "hidden" }}>
            {logs.map((v, i) => {
              const s = STATUS[v.status];
              return (
                <View
                  key={v.id}
                  className="flex-row items-center gap-3"
                  style={{ padding: 16, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: "#333333" }}
                >
                  <View
                    className="items-center justify-center"
                    style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "#242424", borderWidth: 1, borderColor: "#333333" }}
                  >
                    <MaterialIcons name={TYPE_ICON[v.type]} size={20} color="#F5821F" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-body-md font-bold text-on-surface" numberOfLines={1}>
                      {v.name}
                    </Text>
                    <Text className="text-body-sm text-text-muted" numberOfLines={1}>
                      {v.flatNumber ? `Flat ${v.flatNumber} · ` : ""}
                      {VISITOR_TYPE_LABEL[v.type]} · {dayLabel(v.createdAt)}
                    </Text>
                    {(v.entryAt || v.exitAt) && (
                      <Text className="mt-0.5 text-meta-text text-text-muted">
                        {v.entryAt ? `In ${time(v.entryAt)}` : ""}
                        {v.entryAt && v.exitAt ? "  ·  " : ""}
                        {v.exitAt ? `Out ${time(v.exitAt)}` : ""}
                      </Text>
                    )}
                  </View>
                  <View
                    className="items-center justify-center rounded-full px-3 py-1"
                    style={{ backgroundColor: "#242424", borderWidth: 1, borderColor: s.color }}
                  >
                    <Text className="text-label-caps font-semibold uppercase" style={{ color: s.color }}>
                      {s.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
