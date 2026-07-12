import "../global.css";

import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppProviders } from "../providers/app-providers";
import { ErrorBoundary } from "../components/error-boundary";
import { Toast } from "../components/toast";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
          <Toast />
        </SafeAreaProvider>
      </AppProviders>
    </ErrorBoundary>
  );
}
