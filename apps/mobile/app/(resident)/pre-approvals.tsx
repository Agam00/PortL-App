import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { EmptyState } from "../../components/ui/empty-state";
import { StatusDot } from "../../components/ui/status-dot";
import { ListLoading } from "../../components/ui/list-loading";
import { PressableScale } from "../../components/ui/pressable-scale";
import { shadowCard } from "../../lib/shadows";

function formatWindow(visitor: VisitorOutput) {
  const from = visitor.validFrom ? new Date(visitor.validFrom) : null;
  const until = visitor.validUntil ? new Date(visitor.validUntil) : null;
  if (!from || !until) return "No time window";
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  return `${from.toLocaleDateString()} · ${from.toLocaleTimeString([], opts)} - ${until.toLocaleTimeString([], opts)}`;
}

function PreApprovalRow({ visitor, tone, label }: { visitor: VisitorOutput; tone: "green" | "amber" | "neutral" | "red"; label: string }) {
  return (
    <View className="gap-2 rounded-card bg-surface p-4" style={shadowCard}>
      <View className="flex-row items-center justify-between">
        <Text className="text-body-md font-bold text-on-surface">{visitor.name}</Text>
        <StatusDot label={label} tone={tone} />
      </View>
      <View className="flex-row items-center gap-1.5">
        <MaterialIcons name="calendar-today" size={14} color="#797585" />
        <Text className="text-body-sm text-text-muted">{formatWindow(visitor)}</Text>
      </View>
    </View>
  );
}

export default function MyPreApprovals() {
  const router = useRouter();
  const query = trpc.visitors.listPreApprovedForResident.useQuery();
  const all = query.data ?? [];
  const now = Date.now();

  const upcoming = all.filter((v) => v.status === "approved" && (!v.validUntil || new Date(v.validUntil).getTime() >= now));
  const expired = all.filter((v) => v.status === "approved" && v.validUntil && new Date(v.validUntil).getTime() < now);
  const used = all.filter((v) => v.status === "checked_in" || v.status === "checked_out");

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between bg-background px-5 pb-4 pt-2">
        <Text className="flex-1 text-headline-lg font-extrabold text-on-surface">My Pre-approvals</Text>
        <PressableScale
          scaleTo={0.97}
          onPress={() => router.push("/(resident)/pre-approve")}
          className="flex-row items-center gap-1.5 rounded-full bg-primary-container px-4 py-2.5"
          style={shadowCard}
        >
          <MaterialIcons name="add" size={16} color="#fff" />
          <Text className="text-label-md font-bold text-white">New Invite</Text>
        </PressableScale>
      </View>
      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-8"
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
      >
        {query.isLoading ? (
          <ListLoading />
        ) : all.length === 0 ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="No pre-approvals yet" description="Pre-approve a guest and it'll show up here." icon="qr-code" />
          </View>
        ) : (
          <>
            {upcoming.length > 0 && (
              <View className="gap-2">
                <Text className="text-body-sm font-bold uppercase text-text-muted">Upcoming</Text>
                {upcoming.map((v) => (
                  <PreApprovalRow key={v.id} visitor={v} tone="amber" label="Pending" />
                ))}
              </View>
            )}
            {used.length > 0 && (
              <View className="gap-2">
                <Text className="text-body-sm font-bold uppercase text-text-muted">Used</Text>
                {used.map((v) => (
                  <PreApprovalRow key={v.id} visitor={v} tone="neutral" label={v.status === "checked_in" ? "Checked in" : "Completed"} />
                ))}
              </View>
            )}
            {expired.length > 0 && (
              <View className="gap-2">
                <Text className="text-body-sm font-bold uppercase text-text-muted">Expired</Text>
                {expired.map((v) => (
                  <PreApprovalRow key={v.id} visitor={v} tone="red" label="Expired" />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
