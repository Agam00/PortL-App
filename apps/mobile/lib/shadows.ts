import { Platform } from "react-native";

/** Low elevation — cards on the near-black canvas. Deep black ambient shadow. */
export const shadowCard = Platform.select({
  ios: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  android: { elevation: 3 },
  default: {},
});

/** High elevation — FAB, modals. More pronounced black shadow. */
export const shadowElevated = Platform.select({
  ios: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
  },
  android: { elevation: 8 },
  default: {},
});
