import { useState } from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { loginInputSchema } from "@repo/services/auth/model";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../stores/auth-store";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticError } from "../../lib/haptics";
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
  const [showPassword, setShowPassword] = useState(false);

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
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center items-center px-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-[360px]">
          <View className="mb-8 flex-row items-center justify-center gap-1">
            <Text className="text-headline-lg font-semibold tracking-tight text-on-surface">
              Portl
            </Text>
            <View className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-container" />
          </View>

          <View className="w-full gap-4">
            <Controller
              control={control}
              name="identifier"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Phone or email"
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
                  secureTextEntry={!showPassword}
                  placeholder="Password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.password?.message}
                  rightElement={
                    <Pressable
                      accessibilityLabel="Toggle password visibility"
                      onPress={() => setShowPassword((v) => !v)}
                      hitSlop={8}
                    >
                      <MaterialIcons
                        name={showPassword ? "visibility" : "visibility-off"}
                        size={20}
                        color="#8A8F98"
                      />
                    </Pressable>
                  }
                />
              )}
            />

            <Button
              className="mt-2"
              onPress={handleSubmit((values) => loginMutation.mutate(values))}
              loading={loginMutation.isPending}
            >
              Log in
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
