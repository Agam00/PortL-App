import { View, Text, ScrollView, RefreshControl } from "react-native";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { trpc } from "../../lib/trpc";
import { ScreenHeader } from "../../components/ui/screen-header";
import { EmptyState } from "../../components/ui/empty-state";
import { GroupLabel } from "../../components/ui/group-label";
import { StatusDot } from "../../components/ui/status-dot";

function formatWindow(visitor: VisitorOutput) {
  const from = visitor.validFrom ? new Date(visitor.validFrom) : null;
  const until = visitor.validUntil ? new Date(visitor.validUntil) : null;
  if (!from || !until) return "No time window";
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  return `${from.toLocaleDateString()} · ${from.toLocaleTimeString([], opts)} - ${until.toLocaleTimeString([], opts)}`;
}

function PreApprovalRow({ visitor, tone, label }: { visitor: VisitorOutput; tone: "green" | "amber" | "neutral"; label: string }) {
  return (
    <View className="gap-1.5 rounded-lg border border-border-subtle bg-surface-elevated p-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-body-md text-on-surface">{visitor.name}</Text>
        <StatusDot label={label} tone={tone} />
      </View>
      <Text className="text-meta-text text-text-muted">{formatWindow(visitor)}</Text>
    </View>
  );
}

export default function MyPreApprovals() {
  const query = trpc.visitors.listPreApprovedForResident.useQuery();
  const all = query.data ?? [];
  const now = Date.now();

  const upcoming = all.filter((v) => v.status === "approved" && (!v.validUntil || new Date(v.validUntil).getTime() >= now));
  const expired = all.filter((v) => v.status === "approved" && v.validUntil && new Date(v.validUntil).getTime() < now);
  const used = all.filter((v) => v.status === "checked_in" || v.status === "checked_out");

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="My Pre-Approvals" role="resident" />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
      >
        {all.length === 0 ? (
          <View className="rounded-lg border border-border-subtle bg-surface-elevated">
            <EmptyState title="No pre-approvals yet" description="Pre-approve a guest and it'll show up here." icon="qr-code" />
          </View>
        ) : (
          <>
            {upcoming.length > 0 && (
              <View className="gap-2">
                <GroupLabel label="Upcoming" />
                {upcoming.map((v) => (
                  <PreApprovalRow key={v.id} visitor={v} tone="green" label="Upcoming" />
                ))}
              </View>
            )}
            {used.length > 0 && (
              <View className="gap-2">
                <GroupLabel label="Used" />
                {used.map((v) => (
                  <PreApprovalRow key={v.id} visitor={v} tone="neutral" label={v.status === "checked_in" ? "Checked in" : "Used"} />
                ))}
              </View>
            )}
            {expired.length > 0 && (
              <View className="gap-2">
                <GroupLabel label="Expired" />
                {expired.map((v) => (
                  <PreApprovalRow key={v.id} visitor={v} tone="amber" label="Expired" />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
