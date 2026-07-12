import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRoleGuard } from "../../hooks/use-role-guard";
import { LoadingScreen } from "../../components/ui/loading-screen";

const ACCENT = "#d97706";

export default function GuardLayout() {
  const { hasHydrated, user } = useRoleGuard("guard");

  if (!hasHydrated || !user || user.role !== "guard") {
    return <LoadingScreen />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: "#94a3b8",
      }}
    >
      <Tabs.Screen
        name="gate"
        options={{
          title: "Gate",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="visitors"
        options={{
          title: "Visitors",
          tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => <Ionicons name="time" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
