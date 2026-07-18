import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { Avatar } from "./ui/avatar";
import { shadowCard } from "../lib/shadows";

const TYPE_ICON: Record<VisitorOutput["type"], React.ComponentProps<typeof MaterialIcons>["name"]> = {
  delivery: "local-shipping",
  guest: "person-outline",
  cab: "local-taxi",
  service: "cleaning-services",
  other: "more-horiz",
};

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function expectedTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// gate_home mockup: 20px-radius white card, 48px avatar, "Unit 402 • 10 mins ago"
// subtitle, type icon (pending) or EXPECTED pill (pre-booked) on the right, and a
// full-width squared (12px) Mark Entry / Mark Exit button.
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
  const subtitle = [
    visitor.flatNumber ? `Unit ${visitor.flatNumber}` : "Unknown flat",
    visitor.status === "approved" && visitor.source === "resident_preapproved" ? null : timeAgo(visitor.createdAt),
  ]
    .filter(Boolean)
    .join(" • ");

  const showExpected = visitor.status === "approved" && !!visitor.validFrom;
  const isEntry = actionLabel === "Mark Entry";

  return (
    <View className="gap-3 bg-surface p-4" style={[{ borderRadius: 20 }, shadowCard]}>
      <View className="flex-row items-center gap-3">
        <Avatar name={visitor.name} imageUrl={visitor.photoUrl} size={48} />
        <View className="min-w-0 flex-1">
          <Text className="text-body-md font-bold text-on-surface" numberOfLines={1}>
            {visitor.name}
          </Text>
          <Text className="text-body-sm text-text-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {showExpected ? (
          <View className="rounded px-2 py-1" style={{ backgroundColor: "rgba(245,130,31,0.10)" }}>
            <Text className="font-bold uppercase text-primary" style={{ fontSize: 11, letterSpacing: 0.5 }}>
              Expected {expectedTime(visitor.validFrom!)}
            </Text>
          </View>
        ) : (
          <MaterialIcons name={TYPE_ICON[visitor.type]} size={22} color="#C4C4C4" />
        )}
      </View>

      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          disabled={isActionLoading}
          className="flex-row items-center justify-center gap-2 py-3"
          style={{
            borderRadius: 12,
            backgroundColor: isEntry ? "#242424" : "#1A1A1A",
            borderWidth: 1,
            borderColor: isEntry ? "rgba(245,130,31,0.2)" : "#6E6E6E",
          }}
          accessibilityLabel={`${actionLabel} for ${visitor.name}`}
          accessibilityRole="button"
        >
          {isActionLoading ? (
            <ActivityIndicator size="small" color={isEntry ? "#F5821F" : "#C4C4C4"} />
          ) : (
            <>
              <MaterialIcons name={isEntry ? "login" : "logout"} size={18} color={isEntry ? "#F5821F" : "#C4C4C4"} />
              <Text className={`text-body-md font-bold ${isEntry ? "text-primary" : "text-on-surface-variant"}`}>
                {actionLabel}
              </Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}
