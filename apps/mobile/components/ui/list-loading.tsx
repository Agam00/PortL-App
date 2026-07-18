import { ActivityIndicator } from "react-native";

/** The loading spinner shown while a list screen's first fetch is in flight — same everywhere by construction. */
export function ListLoading() {
  return <ActivityIndicator className="py-8" color="#F5821F" />;
}
