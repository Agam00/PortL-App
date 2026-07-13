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
  pending: "Waiting",
  approved: "Approved",
  checked_in: "Checked in",
  rejected: "Rejected",
  expired: "Expired",
  checked_out: "Checked out",
};

export function GuardQueueRow({ visitor }: { visitor: VisitorOutput }) {
  return (
    <View className="flex-row items-center gap-3 rounded-lg border border-border-subtle bg-surface-elevated p-3">
      <View className={`h-2 w-2 rounded-full ${
        STATUS_TONE[visitor.status] === "green"
          ? "bg-status-green"
          : STATUS_TONE[visitor.status] === "amber"
            ? "bg-status-amber"
            : STATUS_TONE[visitor.status] === "red"
              ? "bg-status-red"
              : "bg-text-muted"
      }`} />
      <View className="min-w-0 flex-1">
        <Text className="text-body-md text-on-surface" numberOfLines={1}>
          {visitor.name}
        </Text>
        <Text className="text-meta-text text-text-muted" numberOfLines={1}>
          {visitor.flatNumber ? `Flat ${visitor.flatNumber}` : "Unknown flat"}
        </Text>
      </View>
      <StatusDot label={STATUS_LABEL[visitor.status]} tone={STATUS_TONE[visitor.status]} />
    </View>
  );
}
