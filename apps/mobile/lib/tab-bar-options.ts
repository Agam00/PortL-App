/** Shared bottom-tab styling for all 3 roles — Stitch mockups: white borderless bar
 * with a soft violet-tinted top shadow, violet active tint. */
export const tabBarScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: "#6244CD",
  tabBarInactiveTintColor: "#797585",
  tabBarStyle: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0,
    elevation: 12,
    shadowColor: "#6244CD",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: "700" as const,
  },
} as const;
