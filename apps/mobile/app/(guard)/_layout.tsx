import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useRoleGuard } from "../../hooks/use-role-guard";
import { LoadingScreen } from "../../components/ui/loading-screen";
import { tabBarScreenOptions } from "../../lib/tab-bar-options";

export default function GuardLayout() {
  const { hasHydrated, user } = useRoleGuard("guard");

  if (!hasHydrated || !user || user.role !== "guard") {
    return <LoadingScreen />;
  }

  return (
    <Tabs screenOptions={tabBarScreenOptions}>
      <Tabs.Screen
        name="gate"
        options={{
          title: "Gate",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="verified-user" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="visitors"
        options={{
          title: "Visitors",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="people" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="history" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
