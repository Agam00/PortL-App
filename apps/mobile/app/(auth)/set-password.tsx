import { View, Text } from "react-native";
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

interface SetPasswordForm {
  newPassword: string;
}

export default function SetPasswordScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const showToast = useUiStore((s) => s.showToast);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordForm>({
    resolver: zodResolver(setPasswordInputSchema),
    defaultValues: { newPassword: "" },
  });

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

  return (
    <View className="flex-1 bg-background">
      <View className="w-full flex-row items-center justify-center gap-2 py-8">
        <MaterialIcons name="grid-view" size={20} color="#5e6ad2" />
        <Text className="text-headline-md font-bold tracking-tight text-on-surface">PORTL</Text>
      </View>

      <View className="flex-1 items-center px-6">
        <View className="w-full max-w-[400px] gap-2 rounded-lg border border-border-subtle bg-surface-elevated p-6">
          <Text className="text-headline-lg font-semibold text-on-surface">
            Set new password
          </Text>
          <Text className="mb-4 text-body-md text-text-muted">
            Enter a new secure password for your account.
          </Text>

          <Controller
            control={control}
            name="newPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="New password"
                secureTextEntry
                placeholder="********"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.newPassword?.message}
              />
            )}
          />
          <Text className="mb-2 text-meta-text text-text-muted">
            Must be at least 6 characters long.
          </Text>

          <Button
            className="mt-2"
            onPress={handleSubmit((values) => setPasswordMutation.mutate(values))}
            loading={setPasswordMutation.isPending}
          >
            Save and continue
          </Button>
        </View>
      </View>
    </View>
  );
}
