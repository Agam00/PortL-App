/** Shared bottom-tab styling for all 3 roles — Stitch mockups: white borderless bar
 * with a soft violet-tinted top shadow, violet active tint. */
export const tabBarScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: "#F5821F",
  tabBarInactiveTintColor: "#8A8A8A",
  tabBarStyle: {
    backgroundColor: "#1A1A1A",
    borderTopWidth: 0,
    height: 68,
    paddingTop: 12,
    paddingBottom: 14,
    elevation: 12,
    shadowColor: "#F5821F",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: "700" as const,
  },
} as const;
