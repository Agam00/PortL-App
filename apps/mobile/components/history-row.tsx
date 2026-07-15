import { View, Text } from "react-native";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { StatusDot } from "./ui/status-dot";

const STATUS_TONE: Record<VisitorOutput["status"], "green" | "amber" | "red" | "neutral"> = {
  pending: "amber",
  approved: "green",
  checked_in: "green",
  rejected: "red",
  expired: "neutral",
  checked_out: "neutral",
};

const STATUS_LABEL: Record<VisitorOutput["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  checked_in: "Checked in",
  rejected: "Rejected",
  expired: "Expired",
  checked_out: "Checked out",
};

const TYPE_LABEL: Record<VisitorOutput["type"], string> = {
  delivery: "Delivery",
  guest: "Guest",
  cab: "Cab",
  service: "Service",
  other: "Other",
};

function formatWhen(visitor: VisitorOutput) {
  const iso = visitor.entryAt ?? visitor.createdAt;
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return isToday ? `Today, ${time}` : `${date.toLocaleDateString()}, ${time}`;
}

export function HistoryRow({ visitor, showFlat }: { visitor: VisitorOutput; showFlat?: boolean }) {
  return (
    <View className="flex-row items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface p-4">
      <View className="min-w-0 flex-1">
        <Text className="text-body-md font-medium text-on-surface" numberOfLines={1}>
          {visitor.name}
        </Text>
        <Text className="text-meta-text text-text-muted" numberOfLines={1}>
          {TYPE_LABEL[visitor.type]}
          {showFlat && visitor.flatNumber ? ` · Flat ${visitor.flatNumber}` : ""} · {formatWhen(visitor)}
        </Text>
      </View>
      <StatusDot label={STATUS_LABEL[visitor.status]} tone={STATUS_TONE[visitor.status]} />
    </View>
  );
}
