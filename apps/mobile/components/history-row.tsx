import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { Avatar } from "./ui/avatar";
import { VISITOR_STATUS_LABEL, VISITOR_TYPE_LABEL } from "../lib/visitor-status";
import { shadowCard } from "../lib/shadows";

function formatWhen(visitor: VisitorOutput) {
  const iso = visitor.entryAt ?? visitor.createdAt;
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return isToday ? `Today, ${time}` : `${date.toLocaleDateString()}, ${time}`;
}

// visitor_history mockup: per-status chip treatments (icon + tinted/solid pill) and
// card accents — violet left border while checked in, red border when rejected.
const STATUS_CHIP: Record<
  VisitorOutput["status"],
  { icon: React.ComponentProps<typeof MaterialIcons>["name"]; bg: string; fg: string }
> = {
  pending: { icon: "schedule", bg: "#FEB246", fg: "#3D2E00" },
  approved: { icon: "thumb-up-off-alt", bg: "#E4DAFB", fg: "#4A27B5" },
  checked_in: { icon: "login", bg: "#6244CD", fg: "#FFFFFF" },
  checked_out: { icon: "logout", bg: "#ECE6F2", fg: "#48454F" },
  rejected: { icon: "block", bg: "#FBDADA", fg: "#BA1A1A" },
  expired: { icon: "history-toggle-off", bg: "#ECE6F2", fg: "#48454F" },
  cancelled: { icon: "cancel", bg: "#ECE6F2", fg: "#48454F" },
};

export function HistoryRow({ visitor, showFlat }: { visitor: VisitorOutput; showFlat?: boolean }) {
  const chip = STATUS_CHIP[visitor.status];
  const cardAccent =
    visitor.status === "checked_in"
      ? { borderLeftWidth: 4, borderLeftColor: "#6244CD" }
      : visitor.status === "rejected"
        ? { borderWidth: 1, borderColor: "#F3B8B8" }
        : null;

  return (
    <View className="flex-row items-center gap-3 rounded-xl bg-surface p-4" style={[shadowCard, cardAccent]}>
      <Avatar name={visitor.name} imageUrl={visitor.photoUrl} size={48} />
      <View className="min-w-0 flex-1">
        <Text className="text-body-md font-bold text-on-surface" numberOfLines={1}>
          {visitor.name}
        </Text>
        <Text className="text-body-sm text-text-muted" numberOfLines={1}>
          {VISITOR_TYPE_LABEL[visitor.type]}
          {showFlat && visitor.flatNumber ? ` · Flat ${visitor.flatNumber}` : ""} · {formatWhen(visitor)}
        </Text>
      </View>
      <View
        className="flex-row items-center gap-1 rounded-full px-3 py-1.5"
        style={{ backgroundColor: chip.bg }}
      >
        <MaterialIcons name={chip.icon} size={14} color={chip.fg} />
        <Text className="text-body-sm font-bold" style={{ color: chip.fg }}>
          {VISITOR_STATUS_LABEL[visitor.status]}
        </Text>
      </View>
    </View>
  );
}
