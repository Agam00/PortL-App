import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
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
import { Button } from "../../components/ui/button";
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

        <View className="mt-8 items-center gap-4 rounded-card bg-surface p-6" style={shadowCard}>
          <View className="h-16 w-16 items-center justify-center rounded-full bg-surface-container">
            <MaterialIcons name="lock-reset" size={28} color="#6244CD" />
          </View>

          <View className="items-center gap-1">
            <Text className="text-headline-md font-extrabold text-on-surface">Welcome to PORTL!</Text>
            <Text className="text-body-md text-text-muted">Let's secure your account.</Text>
          </View>

          <View className="w-full gap-1">
            <Controller
              control={control}
              name="newPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="New Password"
                  secureTextEntry
                  placeholder="Enter your new password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.newPassword?.message}
                  leftElement={<MaterialIcons name="lock-outline" size={20} color="#797585" />}
                />
              )}
            />
            <Text className="text-body-sm text-text-muted">Must be at least 6 characters long.</Text>
          </View>

          <Input
            label="Confirm Password"
            secureTextEntry
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              if (confirmError) setConfirmError(null);
            }}
            error={confirmError ?? undefined}
            leftElement={<MaterialIcons name="lock-outline" size={20} color="#797585" />}
            className="w-full"
          />

          <Button
            className="mt-2 w-full"
            onPress={handleSubmit(onSubmit)}
            loading={setPasswordMutation.isPending}
            disabled={!newPassword || !confirmPassword}
          >
            Set Password
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
