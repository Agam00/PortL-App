import { Tabs } from "expo-router";
import { useRoleGuard } from "../../hooks/use-role-guard";
import { LoadingScreen } from "../../components/ui/loading-screen";
import { ResidentTabBar } from "../../components/resident-tab-bar";

export default function ResidentLayout() {
  const { hasHydrated, user } = useRoleGuard("resident");

  if (!hasHydrated || !user || user.role !== "resident") {
    return <LoadingScreen />;
  }

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <ResidentTabBar {...props} />}
    >
      {/* Visible tabs (rendered by ResidentTabBar): Home · Activity · Social · Service */}
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="visitor-history" options={{ title: "Activity" }} />
      <Tabs.Screen name="social" options={{ title: "Social" }} />
      <Tabs.Screen name="services" options={{ title: "Service" }} />

      {/* Reached via router.push (header avatar, home tiles, the + FAB) — hidden from the bar */}
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="notices" options={{ href: null }} />
      <Tabs.Screen name="helpdesk" options={{ href: null }} />
      <Tabs.Screen name="amenities" options={{ href: null }} />
      <Tabs.Screen name="pre-approve" options={{ href: null }} />
      <Tabs.Screen name="pre-approvals" options={{ href: null }} />
      <Tabs.Screen name="visitor-pass" options={{ href: null }} />
      <Tabs.Screen name="blocked" options={{ href: null }} />
      <Tabs.Screen name="amenity-pass" options={{ href: null }} />
      <Tabs.Screen name="alerts-history" options={{ href: null }} />
      <Tabs.Screen name="polls" options={{ href: null }} />
      <Tabs.Screen name="dues" options={{ href: null }} />
      <Tabs.Screen name="pay" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="staff-directory" options={{ href: null }} />
      <Tabs.Screen name="vehicles" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
