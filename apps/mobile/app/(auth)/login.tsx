import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { loginInputSchema } from "@repo/services/auth/model";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../stores/auth-store";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

interface LoginForm {
  identifier: string;
  password: string;
}

export default function LoginScreen() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const showToast = useUiStore((s) => s.showToast);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      setSession(data);
      router.replace("/");
    },
    onError: (error) => {
      showToast(getErrorMessage(error), "error");
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center gap-6 px-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <Text className="text-3xl font-bold text-slate-900">Welcome to Portl</Text>
          <Text className="text-base text-slate-500">
            Sign in with the phone or email your society admin gave you.
          </Text>
        </View>

        <View className="gap-4">
          <Controller
            control={control}
            name="identifier"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Phone or email"
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.identifier?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                secureTextEntry
                placeholder="********"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
              />
            )}
          />
        </View>

        <Button
          onPress={handleSubmit((values) => loginMutation.mutate(values))}
          loading={loginMutation.isPending}
        >
          Log in
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
