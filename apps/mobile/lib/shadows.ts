import { Platform } from "react-native";

/** Low elevation — cards, floating just above the background. Violet-tinted ambient shadow, per DESIGN_SYSTEM.md. */
export const shadowCard = Platform.select({
  ios: {
    shadowColor: "#6244CD",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  android: { elevation: 3 },
  default: {},
});

/** High elevation — FAB, modals. More pronounced, still violet-tinted. */
export const shadowElevated = Platform.select({
  ios: {
    shadowColor: "#6244CD",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  android: { elevation: 8 },
  default: {},
});
