import { View, Text } from "react-native";

type Role = "resident" | "guard" | "admin";

// Emoji + color per role so you can tell at a glance who posted / who you're chatting with.
const ROLE_TAG: Record<Role, { label: string; emoji: string; bg: string; fg: string }> = {
  resident: { label: "Resident", emoji: "🏠", bg: "#242424", fg: "#C4C4C4" },
  guard: { label: "Guard", emoji: "🛡️", bg: "#16233A", fg: "#7FB0FF" },
  admin: { label: "Admin", emoji: "⭐", bg: "#3A2E12", fg: "#FFB74D" },
};

/** Small pill showing a person's role (emoji + label). Renders nothing for an unknown role. */
export function RoleTag({ role, size = "md" }: { role: string; size?: "sm" | "md" }) {
  const tag = ROLE_TAG[role as Role];
  if (!tag) return null;
  const compact = size === "sm";
  return (
    <View
      className="flex-row items-center self-start rounded-full"
      style={{ backgroundColor: tag.bg, paddingHorizontal: compact ? 6 : 8, paddingVertical: compact ? 1 : 2, gap: 3 }}
    >
      <Text style={{ fontSize: compact ? 9 : 11 }}>{tag.emoji}</Text>
      <Text className="font-bold uppercase" style={{ color: tag.fg, fontSize: compact ? 9 : 10, letterSpacing: 0.5 }}>
        {tag.label}
      </Text>
    </View>
  );
}
