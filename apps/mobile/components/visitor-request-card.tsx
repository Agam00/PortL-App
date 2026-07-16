import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { Button } from "./ui/button";
import { Avatar } from "./ui/avatar";
import { VISITOR_TYPE_LABEL } from "../lib/visitor-status";
import { shadowCard } from "../lib/shadows";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  return `${hours} hr${hours === 1 ? "" : "s"} ago`;
}

export function VisitorRequestCard({
  visitor,
  onApprove,
  onReject,
  isDeciding,
}: {
  visitor: VisitorOutput;
  onApprove: () => void;
  onReject: () => void;
  isDeciding: boolean;
}) {
  return (
    <View className="gap-4 rounded-card bg-surface p-4" style={shadowCard}>
      <View className="flex-row items-center gap-3">
        <Avatar name={visitor.name} imageUrl={visitor.photoUrl} size={48} />
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-body-md font-bold text-on-surface" numberOfLines={1}>
              {visitor.name}
            </Text>
            <View className="rounded-full bg-secondary-container px-2.5 py-0.5">
              <Text className="text-label-sm font-bold uppercase text-on-surface">
                {VISITOR_TYPE_LABEL[visitor.type]}
              </Text>
            </View>
          </View>
          <View className="mt-0.5 flex-row items-center gap-1">
            <MaterialIcons name="schedule" size={14} color="#797585" />
            <Text className="text-body-sm text-text-muted">{timeAgo(visitor.createdAt)}</Text>
          </View>
        </View>
      </View>

      <View className="flex-row gap-3">
        <Button className="flex-1" variant="secondary" onPress={onReject} loading={isDeciding} disabled={isDeciding}>
          Reject
        </Button>
        <Button className="flex-1" variant="success" onPress={onApprove} loading={isDeciding} disabled={isDeciding}>
          Approve
        </Button>
      </View>
    </View>
  );
}
