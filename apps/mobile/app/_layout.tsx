import "../global.css";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { AppProviders } from "../providers/app-providers";
import { ErrorBoundary } from "../components/error-boundary";
import { Toast } from "../components/toast";
import { PushRegistration } from "../components/push-registration";
import { useAuthStore } from "../stores/auth-store";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Portl uses the "Friendly Community Console" light-mode design system (see DESIGN_SYSTEM.md).
export default function RootLayout() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hasHydrated]);

  return (
    <ErrorBoundary>
      <AppProviders>
        <SafeAreaProvider>
          <View className="flex-1 bg-background">
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0D0D0D" } }} />
            <Toast />
            <PushRegistration />
          </View>
        </SafeAreaProvider>
      </AppProviders>
    </ErrorBoundary>
  );
}
