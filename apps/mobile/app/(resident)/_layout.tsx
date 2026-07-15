import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useRoleGuard } from "../../hooks/use-role-guard";
import { LoadingScreen } from "../../components/ui/loading-screen";
import { tabBarScreenOptions } from "../../lib/tab-bar-options";

export default function ResidentLayout() {
  const { hasHydrated, user } = useRoleGuard("resident");

  if (!hasHydrated || !user || user.role !== "resident") {
    return <LoadingScreen />;
  }

  return (
    <Tabs screenOptions={tabBarScreenOptions}>
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <MaterialIcons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notices"
        options={{
          title: "Notices",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="campaign" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="helpdesk"
        options={{
          title: "Helpdesk",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="support-agent" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="amenities"
        options={{
          title: "Amenities",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="event" color={color} size={size} />
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
      <Tabs.Screen name="pre-approve" options={{ href: null }} />
      <Tabs.Screen name="pre-approvals" options={{ href: null }} />
      <Tabs.Screen name="visitor-history" options={{ href: null }} />
      <Tabs.Screen name="polls" options={{ href: null }} />
      <Tabs.Screen name="dues" options={{ href: null }} />
      <Tabs.Screen name="staff-directory" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
