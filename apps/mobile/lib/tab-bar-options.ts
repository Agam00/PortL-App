/** Shared bottom-tab styling for all 3 roles — see DESIGN_SYSTEM.md. */
export const tabBarScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: "#6244CD",
  tabBarInactiveTintColor: "#797585",
  tabBarStyle: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#CAC4D6",
    borderTopWidth: 1,
  },
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: "700" as const,
  },
} as const;
