import { View, Text } from "react-native";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { StatusDot } from "./ui/status-dot";
import { VISITOR_STATUS_TONE, VISITOR_STATUS_LABEL, VISITOR_TYPE_LABEL } from "../lib/visitor-status";

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
          {VISITOR_TYPE_LABEL[visitor.type]}
          {showFlat && visitor.flatNumber ? ` · Flat ${visitor.flatNumber}` : ""} · {formatWhen(visitor)}
        </Text>
      </View>
      <StatusDot label={VISITOR_STATUS_LABEL[visitor.status]} tone={VISITOR_STATUS_TONE[visitor.status]} />
    </View>
  );
}
