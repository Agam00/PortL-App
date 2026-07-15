import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { Button } from "./ui/button";
import { StatusDot } from "./ui/status-dot";
import { VISITOR_TYPE_LABEL, VISITOR_STATUS_LABEL, VISITOR_STATUS_TONE } from "../lib/visitor-status";

const TYPE_ICON: Record<VisitorOutput["type"], React.ComponentProps<typeof MaterialIcons>["name"]> = {
  delivery: "local-shipping",
  guest: "person",
  cab: "local-taxi",
  service: "build",
  other: "badge",
};

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
    <View className="gap-3 rounded-lg border border-border-subtle bg-surface-elevated p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full border border-border-subtle bg-surface-container-high">
            <MaterialIcons name={TYPE_ICON[visitor.type]} size={20} color="#c6c5d5" />
          </View>
          <View>
            <Text className="text-headline-md font-semibold leading-tight text-on-surface">
              {visitor.name}
            </Text>
            <Text className="text-body-sm text-text-muted">{VISITOR_TYPE_LABEL[visitor.type]}</Text>
          </View>
        </View>
        <StatusDot label={VISITOR_STATUS_LABEL.pending} tone={VISITOR_STATUS_TONE.pending} />
      </View>

      <Text className="text-body-sm text-text-muted">{timeAgo(visitor.createdAt)}</Text>

      <View className="mt-2 flex-row gap-3">
        <Button className="flex-1" variant="primary" onPress={onApprove} loading={isDeciding} disabled={isDeciding}>
          Approve
        </Button>
        <Button className="flex-1" variant="outline" onPress={onReject} loading={isDeciding} disabled={isDeciding}>
          Reject
        </Button>
      </View>
    </View>
  );
}
