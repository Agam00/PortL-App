import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { shadowElevated } from "../lib/shadows";

// Minimal structural subset of React Navigation's BottomTabBarProps — avoids taking a
// direct dependency on @react-navigation/bottom-tabs (it's only a transitive dep of expo-router).
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: never) => void };
};

// Bottom nav mirrors the reference: Home · Activity · Social · Service on the left,
// with a raised violet "+" quick-add on the right.
const TABS: { name: string; label: string; icon: React.ComponentProps<typeof MaterialIcons>["name"] }[] = [
  { name: "home", label: "Home", icon: "home-filled" },
  { name: "visitor-history", label: "Activity", icon: "event-note" },
  { name: "social", label: "Social", icon: "groups" },
  { name: "services", label: "Service", icon: "handyman" },
];

// Modal-style screens render their own full-screen surface — the tab bar must not show under them.
const HIDE_BAR_ON = ["pre-approve", "pay"];

export function ResidentTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const activeName = state.routes[state.index]?.name;

  if (activeName && HIDE_BAR_ON.includes(activeName)) return null;

  return (
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
          onPress={() => router.push("/(resident)/pre-approve")}
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
          accessibilityLabel="New pre-approval"
        >
          <MaterialIcons name="add" size={30} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}
