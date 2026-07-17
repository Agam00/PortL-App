import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { VisitorOutput } from "@repo/services/visitor/model";
import { Avatar } from "./ui/avatar";
import { VISITOR_TYPE_LABEL } from "../lib/visitor-status";
import { shadowCard } from "../lib/shadows";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Waiting at Gate";
  if (mins < 60) return `Waiting ${mins} min${mins === 1 ? "" : "s"}`;
  const hours = Math.floor(mins / 60);
  return `Waiting ${hours} hr${hours === 1 ? "" : "s"}`;
}

// Matches home_dashboard mockup: 12px card, 64px photo avatar, amber-tinted type
// pill, squared (8px) Reject/Approve buttons — Approve in the mockup's green.
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
    <View className="gap-4 rounded-xl bg-surface p-4" style={shadowCard}>
      <View className="flex-row items-center gap-4">
        <Avatar name={visitor.name} imageUrl={visitor.photoUrl} size={64} />
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-body-lg font-bold text-on-surface" numberOfLines={1}>
              {visitor.name}
            </Text>
            <View className="rounded-full bg-secondary-container/20 px-2 py-0.5">
              <Text className="font-bold uppercase text-secondary" style={{ fontSize: 10, letterSpacing: 0.5 }}>
                {VISITOR_TYPE_LABEL[visitor.type]}
              </Text>
            </View>
          </View>
          <View className="mt-1 flex-row items-center gap-1">
            <MaterialIcons name="schedule" size={16} color="#48454F" />
            <Text className="text-body-sm text-on-surface-variant">{timeAgo(visitor.createdAt)}</Text>
          </View>
        </View>
      </View>

      <View className="flex-row gap-2">
        <Pressable
          onPress={onReject}
          disabled={isDeciding}
          className="flex-1 items-center justify-center rounded-lg border border-outline-variant bg-surface-container px-4 py-2.5"
          accessibilityLabel={`Reject ${visitor.name}`}
          accessibilityRole="button"
        >
          <Text className="text-body-md font-bold text-on-surface">Reject</Text>
        </Pressable>
        <Pressable
          onPress={onApprove}
          disabled={isDeciding}
          className="flex-1 items-center justify-center rounded-lg px-4 py-2.5"
          style={{ backgroundColor: "#22c55e" }}
          accessibilityLabel={`Approve ${visitor.name}`}
          accessibilityRole="button"
        >
          {isDeciding ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="text-body-md font-bold" style={{ color: "#FFFFFF" }}>
              Approve
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
