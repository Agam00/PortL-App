import { Redirect } from "expo-router";
import { useAuthStore } from "../stores/auth-store";
import { LoadingScreen } from "../components/ui/loading-screen";

export default function Index() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const user = useAuthStore((s) => s.user);

  if (!hasHydrated) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.mustResetPassword) {
    return <Redirect href="/(auth)/set-password" />;
  }

  switch (user.role) {
    case "resident":
      return <Redirect href="/(resident)/home" />;
    case "guard":
      return <Redirect href="/(guard)/gate" />;
    case "admin":
      return <Redirect href="/(admin)/dashboard" />;
    default:
      return <Redirect href="/(auth)/login" />;
  }
}
