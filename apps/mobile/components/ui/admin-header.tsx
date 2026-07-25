import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Avatar } from "./avatar";
import { useAuthStore } from "../../stores/auth-store";

interface AdminHeaderAction {
  label: string;
  onPress: () => void;
}

/**
 * Admin header matching the "Obsidian & Amber" Stitch mockups: a flat near-black bar
 * (no orange fill), with a few composable pieces —
 *  - a top bar row: optional back arrow, a bar title (left-aligned or centered wordmark),
 *    and an optional orange text action ("+ Add");
 *  - an optional big display title block below (with eyebrow / subtitle / avatar).
 *
 * Patterns used across screens:
 *  - home:     eyebrow + bigTitle + avatar, no top bar (Dashboard)
 *  - plain:    bigTitle + subtitle, no top bar (Alerts)
 *  - bar:      back + bar title (left) + action (Residents, Operations)
 *  - wordmark: back + centered "Portl" + action, then bigTitle below (Community, Management)
 */
export function AdminHeader({
  showBack = false,
  barTitle,
  centerBar = false,
  action,
  bigTitle,
  subtitle,
  eyebrow,
  avatar = false,
  onAvatarPress,
}: {
  showBack?: boolean;
  barTitle?: string;
  centerBar?: boolean;
  action?: AdminHeaderAction;
  bigTitle?: string;
  subtitle?: string;
  eyebrow?: string;
  avatar?: boolean;
  onAvatarPress?: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const hasTopBar = showBack || !!barTitle || !!action;

  return (
    <View style={{ backgroundColor: "#0D0D0D" }}>
      {hasTopBar && (
        <View
          className="flex-row items-center px-4 pb-3"
          style={{
            paddingTop: insets.top + 8,
            borderBottomWidth: 1,
            borderBottomColor: "#333333",
          }}
        >
          <View className="flex-row items-center" style={{ minWidth: 84 }}>
            {showBack && (
              <Pressable
                onPress={() => router.back()}
                hitSlop={10}
                accessibilityLabel="Go back"
                accessibilityRole="button"
                className="h-10 w-10 items-center justify-center"
              >
                <MaterialIcons name="arrow-back" size={24} color="#F5F5F5" />
              </Pressable>
            )}
          </View>

          <View className={`flex-1 ${centerBar ? "items-center" : "items-start"}`}>
            {barTitle && (
              <Text
                className="font-extrabold text-on-surface"
                style={{
                  fontSize: centerBar ? 20 : 26,
                  letterSpacing: centerBar ? 0.5 : -0.5,
                }}
                numberOfLines={1}
              >
                {barTitle}
              </Text>
            )}
          </View>

          <View className="flex-row items-center justify-end" style={{ minWidth: 84 }}>
            {action && (
              <Pressable
                onPress={action.onPress}
                hitSlop={10}
                accessibilityLabel={action.label}
                accessibilityRole="button"
              >
                <Text className="text-body-lg font-bold text-primary" numberOfLines={1}>
                  {action.label}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {bigTitle && (
        <View
          className="flex-row items-start justify-between px-5 pb-2 pt-5"
          style={hasTopBar ? undefined : { paddingTop: insets.top + 16 }}
        >
          <View className="min-w-0 flex-1">
            {eyebrow && <Text className="mb-1 text-body-sm text-text-muted">{eyebrow}</Text>}
            <Text
              className="font-extrabold text-on-surface"
              style={{ fontSize: 28, lineHeight: 34, letterSpacing: -0.5 }}
            >
              {bigTitle}
            </Text>
            {subtitle && <Text className="pt-1.5 text-body-md text-on-surface-variant">{subtitle}</Text>}
          </View>

          {avatar && (
            <Pressable
              onPress={onAvatarPress}
              disabled={!onAvatarPress}
              hitSlop={8}
              accessibilityLabel="Your profile"
              accessibilityRole="button"
              style={{ borderRadius: 24, borderWidth: 1, borderColor: "#333333", overflow: "hidden" }}
            >
              <Avatar name={user?.fullName ?? "?"} size={48} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
