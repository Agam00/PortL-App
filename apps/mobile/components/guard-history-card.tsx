import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { Avatar } from "./ui/avatar";
import { VISITOR_STATUS_LABEL, VISITOR_TYPE_LABEL } from "../lib/visitor-status";
import { shadowCard } from "../lib/shadows";

// entry_exit_history mockup: white 16px-radius card with avatar + name + type,
// a FLAT / TIME two-column grid, and a tinted status chip at the bottom left.
// Rejected entries get a soft red border and "ATTEMPTED FLAT" label.
const STATUS_CHIP: Record<
  VisitorOutput["status"],
  { icon: React.ComponentProps<typeof MaterialIcons>["name"]; bg: string; fg: string }
> = {
  pending: { icon: "schedule", bg: "rgba(254,178,70,0.25)", fg: "#845400" },
  approved: { icon: "thumb-up-off-alt", bg: "#E4DAFB", fg: "#4A27B5" },
  checked_in: { icon: "login", bg: "#D8E6FA", fg: "#2E5AAC" },
  checked_out: { icon: "logout", bg: "#ECE6F2", fg: "#48454F" },
  rejected: { icon: "block", bg: "#BA1A1A", fg: "#FFFFFF" },
  expired: { icon: "history-toggle-off", bg: "#ECE6F2", fg: "#48454F" },
  cancelled: { icon: "cancel", bg: "#ECE6F2", fg: "#48454F" },
};

function formatTime(visitor: VisitorOutput) {
  const iso = visitor.entryAt ?? visitor.createdAt;
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function GuardHistoryCard({ visitor }: { visitor: VisitorOutput }) {
  const chip = STATUS_CHIP[visitor.status];
  const isRejected = visitor.status === "rejected";

  return (
    <View
      className="gap-3 bg-surface p-4"
      style={[
        { borderRadius: 16 },
        shadowCard,
        isRejected ? { borderWidth: 1, borderColor: "#F3B8B8" } : null,
      ]}
    >
      <View className="flex-row items-center gap-3">
        <Avatar name={visitor.name} imageUrl={visitor.photoUrl} size={48} />
        <View className="min-w-0 flex-1">
          <Text className="text-body-md font-bold text-on-surface" numberOfLines={1}>
            {visitor.name}
          </Text>
          <Text className="text-body-sm text-text-muted" numberOfLines={1}>
            {VISITOR_TYPE_LABEL[visitor.type]}
          </Text>
        </View>
      </View>

      <View className="flex-row">
        <View className="flex-1 gap-1">
          <Text className="font-bold uppercase text-text-muted" style={{ fontSize: 11, letterSpacing: 1 }}>
            {isRejected ? "Attempted Flat" : "Flat"}
          </Text>
          <View className="self-start rounded px-2 py-0.5" style={{ backgroundColor: "#ECE9F1" }}>
            <Text className="text-body-md font-bold text-on-surface">{visitor.flatNumber ?? "—"}</Text>
          </View>
        </View>
        <View className="flex-1 gap-1">
          <Text className="font-bold uppercase text-text-muted" style={{ fontSize: 11, letterSpacing: 1 }}>
            Time
          </Text>
          <Text className="text-body-md font-bold text-on-surface">{formatTime(visitor)}</Text>
        </View>
      </View>

      <View
        className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5"
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
