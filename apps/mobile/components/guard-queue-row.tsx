import { View, Text } from "react-native";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { StatusDot } from "./ui/status-dot";
import { Button } from "./ui/button";
import { Avatar } from "./ui/avatar";
import { VISITOR_STATUS_TONE, VISITOR_STATUS_LABEL } from "../lib/visitor-status";
import { shadowCard } from "../lib/shadows";

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
    <View className="gap-3 rounded-card bg-surface p-4" style={shadowCard}>
      <View className="flex-row items-center gap-3">
        <Avatar name={visitor.name} imageUrl={visitor.photoUrl} size={40} />
        <View className="min-w-0 flex-1">
          <Text className="text-body-md font-bold text-on-surface" numberOfLines={1}>
            {visitor.name}
          </Text>
          <Text className="text-body-sm text-text-muted" numberOfLines={1}>
            {visitor.flatNumber ? `Unit ${visitor.flatNumber}` : "Unknown flat"}
          </Text>
        </View>
        <StatusDot label={VISITOR_STATUS_LABEL[visitor.status]} tone={VISITOR_STATUS_TONE[visitor.status]} />
      </View>
      {actionLabel && onAction && (
        <Button variant="outline" onPress={onAction} loading={isActionLoading}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}
