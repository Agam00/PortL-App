import { Fragment } from "react";
import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useRoleGuard } from "../../hooks/use-role-guard";
import { LoadingScreen } from "../../components/ui/loading-screen";
import { StaffAlertPopup } from "../../components/staff-alert-popup";
import { tabBarScreenOptions } from "../../lib/tab-bar-options";

export default function AdminLayout() {
  const { hasHydrated, user } = useRoleGuard("admin");

  if (!hasHydrated || !user || user.role !== "admin") {
    return <LoadingScreen />;
  }

  return (
    <Fragment>
    <Tabs backBehavior="history" screenOptions={{ ...tabBarScreenOptions, tabBarShowLabel: false }}>
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
          title: "Management",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="hub" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Operations",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="engineering" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: "Community",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="forum" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="notifications" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="more" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="towers" options={{ href: null }} />
      <Tabs.Screen name="flats" options={{ href: null }} />
      <Tabs.Screen name="residents" options={{ href: null }} />
      <Tabs.Screen name="guards" options={{ href: null }} />
      <Tabs.Screen name="amenities" options={{ href: null }} />
      <Tabs.Screen name="notices" options={{ href: null }} />
      <Tabs.Screen name="polls" options={{ href: null }} />
      <Tabs.Screen name="staff" options={{ href: null }} />
      <Tabs.Screen name="dues" options={{ href: null }} />
    </Tabs>
    {/* Resident emergency alerts + guard reports pop up here; OK auto-replies to the sender. */}
    <StaffAlertPopup responder="management" />
    </Fragment>
  );
}
