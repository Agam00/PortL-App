import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { setPasswordInputSchema } from "@repo/services/auth/model";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../stores/auth-store";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { Input } from "../../components/ui/input";
import { shadowCard } from "../../lib/shadows";

interface SetPasswordForm {
  newPassword: string;
}

export default function SetPasswordScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const showToast = useUiStore((s) => s.showToast);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SetPasswordForm>({
    resolver: zodResolver(setPasswordInputSchema),
    defaultValues: { newPassword: "" },
  });

  const newPassword = watch("newPassword");

  const setPasswordMutation = trpc.auth.setPassword.useMutation({
    onSuccess: () => {
      hapticSuccess();
      if (user) updateUser({ ...user, mustResetPassword: false });
      showToast("Password updated", "success");
      router.replace("/");
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  function onSubmit(values: SetPasswordForm) {
    if (values.newPassword !== confirmPassword) {
      setConfirmError("Passwords don't match");
      return;
    }
    setConfirmError(null);
    setPasswordMutation.mutate(values);
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="flex-grow justify-center px-6 py-12">
      <View className="w-full max-w-[400px] self-center">
        <Text className="text-center text-headline-xl font-extrabold tracking-tight text-primary-container">
          PORTL
        </Text>
        <Text className="mt-1 text-center text-body-md text-text-muted">Friendly Community Console</Text>

        <View className="mt-8 items-center gap-4 bg-surface p-6" style={[{ borderRadius: 24 }, shadowCard]}>
          <View
            className="items-center justify-center"
            style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#2A2320" }}
          >
            <MaterialIcons name="lock-reset" size={32} color="#F5821F" />
          </View>

          <View className="items-center gap-1">
            <Text className="text-center text-headline-lg font-extrabold text-on-surface">Welcome to PORTL!</Text>
            <Text className="text-body-lg text-on-surface-variant">Let's secure your account.</Text>
          </View>

          <View className="w-full gap-2">
            <Text className="text-body-md font-bold text-on-surface">New Password</Text>
            <Controller
              control={control}
              name="newPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  secureTextEntry
                  placeholder="Enter your new password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.newPassword?.message}
                  leftElement={<MaterialIcons name="lock-outline" size={20} color="#8A8A8A" />}
                  style={{ backgroundColor: "#242424", borderWidth: 0 }}
                />
              )}
            />
            <Text className="text-body-sm text-text-muted">Must be at least 6 characters long.</Text>
          </View>

          <View className="w-full gap-2">
            <Text className="text-body-md font-bold text-on-surface">Confirm Password</Text>
            <Input
              secureTextEntry
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={(v) => {
                setConfirmPassword(v);
                if (confirmError) setConfirmError(null);
              }}
              error={confirmError ?? undefined}
              leftElement={<MaterialIcons name="password" size={20} color="#8A8A8A" />}
              style={{ backgroundColor: "#242424", borderWidth: 0 }}
            />
          </View>

          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={!newPassword || !confirmPassword || setPasswordMutation.isPending}
            className="mt-2 h-14 w-full flex-row items-center justify-center gap-2 rounded-full"
            style={{ backgroundColor: !newPassword || !confirmPassword ? "#7A5320" : "#F5821F" }}
            accessibilityLabel="Set password"
            accessibilityRole="button"
          >
            <Text className="text-body-lg font-bold" style={{ color: "#FFFFFF" }}>
              {setPasswordMutation.isPending ? "Saving..." : "Set Password"}
            </Text>
            {!setPasswordMutation.isPending && <MaterialIcons name="arrow-forward" size={20} color="#fff" />}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
