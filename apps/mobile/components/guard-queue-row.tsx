import { View, Text } from "react-native";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { StatusDot } from "./ui/status-dot";
import { Button } from "./ui/button";
import { VISITOR_STATUS_TONE, VISITOR_STATUS_LABEL } from "../lib/visitor-status";

const DOT_CLASS: Record<"green" | "amber" | "red" | "neutral", string> = {
  green: "bg-status-green",
  amber: "bg-status-amber",
  red: "bg-status-red",
  neutral: "bg-text-muted",
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
        <View className={`h-2 w-2 rounded-full ${DOT_CLASS[VISITOR_STATUS_TONE[visitor.status]]}`} />
        <View className="min-w-0 flex-1">
          <Text className="text-body-md text-on-surface" numberOfLines={1}>
            {visitor.name}
          </Text>
          <Text className="text-meta-text text-text-muted" numberOfLines={1}>
            {visitor.flatNumber ? `Flat ${visitor.flatNumber}` : "Unknown flat"}
          </Text>
        </View>
        <StatusDot label={VISITOR_STATUS_LABEL[visitor.status]} tone={VISITOR_STATUS_TONE[visitor.status]} />
      </View>
      {actionLabel && onAction && (
        <Button variant="primary" onPress={onAction} loading={isActionLoading}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}
