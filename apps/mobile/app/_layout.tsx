import "../global.css";

import { Stack } from "expo-router";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppProviders } from "../providers/app-providers";
import { ErrorBoundary } from "../components/error-boundary";
import { Toast } from "../components/toast";
import { PushRegistration } from "../components/push-registration";

// Portl is dark-mode-only by design (see DESIGN_SYSTEM.md) — no light theme exists.
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <SafeAreaProvider>
          <View className="flex-1 bg-background">
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#131314" } }} />
            <Toast />
            <PushRegistration />
          </View>
        </SafeAreaProvider>
      </AppProviders>
    </ErrorBoundary>
  );
}
