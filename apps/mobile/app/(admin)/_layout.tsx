import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useRoleGuard } from "../../hooks/use-role-guard";
import { LoadingScreen } from "../../components/ui/loading-screen";
import { tabBarScreenOptions } from "../../lib/tab-bar-options";

export default function AdminLayout() {
  const { hasHydrated, user } = useRoleGuard("admin");

  if (!hasHydrated || !user || user.role !== "admin") {
    return <LoadingScreen />;
  }

  return (
    <Tabs screenOptions={tabBarScreenOptions}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="grid-view" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="society"
        options={{
          title: "Society",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="business" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="fact-check" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => <MaterialIcons name="menu" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
