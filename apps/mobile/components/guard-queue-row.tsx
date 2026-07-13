import { View, Text } from "react-native";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { StatusDot } from "./ui/status-dot";
import { Button } from "./ui/button";

const STATUS_TONE: Record<VisitorOutput["status"], "green" | "amber" | "red" | "neutral"> = {
  pending: "amber",
  approved: "green",
  checked_in: "green",
  rejected: "red",
  expired: "neutral",
  checked_out: "neutral",
};

const DOT_CLASS: Record<"green" | "amber" | "red" | "neutral", string> = {
  green: "bg-status-green",
  amber: "bg-status-amber",
  red: "bg-status-red",
  neutral: "bg-text-muted",
};

const STATUS_LABEL: Record<VisitorOutput["status"], string> = {
  pending: "Waiting",
  approved: "Approved",
  checked_in: "Checked in",
  rejected: "Rejected",
  expired: "Expired",
  checked_out: "Checked out",
};

export function GuardQueueRow({
  visitor,
  actionLabel,
  onAction,
  isActionLoading,
}: {
  visitor: VisitorOutput;
  actionLabel?: string;
  onAction?: () => void;
  isActionLoading?: boolean;
}) {
  return (
    <View className="gap-3 rounded-lg border border-border-subtle bg-surface-elevated p-3">
      <View className="flex-row items-center gap-3">
        <View className={`h-2 w-2 rounded-full ${DOT_CLASS[STATUS_TONE[visitor.status]]}`} />
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
      {actionLabel && onAction && (
        <Button variant="primary" onPress={onAction} loading={isActionLoading}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}
