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
import { shadowCard } from "../../lib/shadows";

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
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-12" keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-[400px] self-center">
          <Text className="text-center text-headline-xl font-extrabold tracking-tight text-primary-container">
            PORTL
          </Text>

          <View className="mt-8 gap-2">
            <Text className="text-center text-headline-lg font-extrabold text-on-surface">Welcome Home</Text>
            <Text className="text-center text-body-md text-text-muted">
              Sign in to access your community console and connect with neighbors.
            </Text>
          </View>

          <View className="mt-8 gap-4 rounded-card bg-surface p-6" style={shadowCard}>
            <Controller
              control={control}
              name="identifier"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email or Phone"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="jane@example.com"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.identifier?.message}
                  leftElement={<MaterialIcons name="person-outline" size={20} color="#797585" />}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Password"
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.password?.message}
                  leftElement={<MaterialIcons name="lock-outline" size={20} color="#797585" />}
                  rightElement={
                    <Pressable
                      accessibilityLabel="Toggle password visibility"
                      onPress={() => setShowPassword((v) => !v)}
                      hitSlop={8}
                    >
                      <MaterialIcons
                        name={showPassword ? "visibility" : "visibility-off"}
                        size={20}
                        color="#797585"
                      />
                    </Pressable>
                  }
                />
              )}
            />

            <Pressable
              className="self-end"
              hitSlop={8}
              onPress={() => showToast("Contact your society admin to reset your password", "info")}
            >
              <Text className="text-body-sm font-bold text-primary-container">Forgot Password?</Text>
            </Pressable>

            <Button
              className="mt-2"
              onPress={handleSubmit((values) => loginMutation.mutate(values))}
              loading={loginMutation.isPending}
            >
              Sign In
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
