import { useState } from "react";
import { View, Text, Pressable, Image, Modal } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { trpc } from "../lib/trpc";
import { useUiStore } from "../stores/ui-store";
import { getErrorMessage } from "../lib/error-message";
import { hapticSuccess, hapticError } from "../lib/haptics";
import { shadowElevated, shadowCard } from "../lib/shadows";

// Minimal structural subset of React Navigation's BottomTabBarProps — avoids taking a
// direct dependency on @react-navigation/bottom-tabs (it's only a transitive dep of expo-router).
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: never) => void };
};

type AlertType = "send_admin" | "send_security" | "fire" | "stuck_lift" | "animal_threat" | "visitor_threat";

const TABS: { name: string; label: string; icon: React.ComponentProps<typeof MaterialIcons>["name"] }[] = [
  { name: "home", label: "Home", icon: "home-filled" },
  { name: "visitor-history", label: "Activity", icon: "event-note" },
  { name: "social", label: "Social", icon: "groups" },
  { name: "services", label: "Service", icon: "handyman" },
];

const SEND_MESSAGE: { label: string; type: AlertType; img: ImageSourcePropType }[] = [
  { label: "Admin", type: "send_admin", img: require("../assets/quick-actions/admin.png") },
  { label: "Security", type: "send_security", img: require("../assets/quick-actions/security.png") },
];

const SECURITY_ALERTS: { label: string; type: AlertType; img: ImageSourcePropType }[] = [
  { label: "Fire Alert", type: "fire", img: require("../assets/quick-actions/fire.png") },
  { label: "Stuck in Lift", type: "stuck_lift", img: require("../assets/quick-actions/lift.png") },
  { label: "Animal Threat", type: "animal_threat", img: require("../assets/quick-actions/animal.png") },
  { label: "Visitor Threat", type: "visitor_threat", img: require("../assets/quick-actions/visitor.png") },
];

// Modal-style screens render their own full-screen surface — the tab bar must not show under them.
const HIDE_BAR_ON = ["pre-approve", "pay", "chat"];

export function ResidentTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const [menuOpen, setMenuOpen] = useState(false);
  const activeName = state.routes[state.index]?.name;

  const raiseMutation = trpc.alerts.raise.useMutation({
    onSuccess: (_data, vars) => {
      hapticSuccess();
      const emergency = vars.type !== "send_admin" && vars.type !== "send_security";
      showToast(emergency ? "Alert sent to society staff 🚨" : "Message sent", emergency ? "error" : "success");
      setMenuOpen(false);
    },
    onError: (e) => {
      hapticError();
      showToast(getErrorMessage(e), "error");
    },
  });

  if (activeName && HIDE_BAR_ON.includes(activeName)) return null;

  const tile = (item: { label: string; type: AlertType; img: ImageSourcePropType }) => (
    <Pressable
      key={item.type}
      onPress={() => raiseMutation.mutate({ type: item.type })}
      disabled={raiseMutation.isPending}
      className="items-center gap-1.5 rounded-2xl p-3"
      style={{ width: "48%", backgroundColor: "#242424" }}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <Image source={item.img} style={{ width: 46, height: 46 }} resizeMode="contain" />
      <Text className="text-center text-body-sm font-bold text-on-surface">{item.label}</Text>
    </Pressable>
  );

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#1A1A1A",
          paddingTop: 10,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          elevation: 12,
          shadowColor: "#F5821F",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        }}
      >
        <View style={{ flex: 1, flexDirection: "row" }}>
          {TABS.map((tab) => {
            const focused = activeName === tab.name;
            const color = focused ? "#F5821F" : "#8A8A8A";
            return (
              <Pressable
                key={tab.name}
                onPress={() => navigation.navigate(tab.name as never)}
                style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 4 }}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={tab.label}
              >
                <MaterialIcons name={tab.icon} size={24} color={color} />
                <Text style={{ fontSize: 11, fontWeight: "700", color }}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ width: 76, alignItems: "center", justifyContent: "center" }}>
          <Pressable
            onPress={() => setMenuOpen((v) => !v)}
            style={[
              {
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "#F5821F",
                alignItems: "center",
                justifyContent: "center",
                transform: [{ translateY: -10 }],
              },
              shadowElevated,
            ]}
            accessibilityRole="button"
            accessibilityLabel={menuOpen ? "Close quick actions" : "Quick actions"}
          >
            <MaterialIcons name={menuOpen ? "close" : "add"} size={30} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable className="flex-1" style={{ backgroundColor: "rgba(0,0,0,0.55)" }} onPress={() => setMenuOpen(false)}>
          <Pressable
            onPress={() => {}}
            className="absolute gap-4 rounded-3xl p-5"
            style={[
              { right: 12, left: 12, bottom: insets.bottom + 92, backgroundColor: "#1A1A1A" },
              shadowCard,
            ]}
          >
            <View className="gap-2">
              <Text className="text-body-md font-extrabold text-on-surface">Send Message</Text>
              <View className="flex-row justify-between">{SEND_MESSAGE.map(tile)}</View>
            </View>

            <View className="gap-2">
              <Text className="text-body-md font-extrabold text-on-surface">Security Alert</Text>
              <View className="flex-row flex-wrap justify-between gap-y-3">{SECURITY_ALERTS.map(tile)}</View>
            </View>

            <Pressable
              onPress={() => {
                setMenuOpen(false);
                router.push("/(resident)/alerts-history");
              }}
              className="flex-row items-center justify-center gap-2 rounded-2xl py-3"
              style={{ backgroundColor: "#242424" }}
              accessibilityRole="button"
              accessibilityLabel="View alert history"
            >
              <MaterialIcons name="history" size={18} color="#F5821F" />
              <Text className="text-body-md font-bold" style={{ color: "#F5821F" }}>
                View alert history
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
