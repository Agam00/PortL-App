import { View, Text } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { setPasswordInputSchema } from "@repo/services/auth/model";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../stores/auth-store";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
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
      if (user) updateUser({ ...user, mustResetPassword: false });
      showToast("Password updated", "success");
      router.replace("/");
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  return (
    <View className="flex-1 justify-center gap-6 bg-white px-6">
      <View className="gap-2">
        <Text className="text-2xl font-bold text-slate-900">Set a new password</Text>
        <Text className="text-base text-slate-500">
          For security, choose a new password before continuing.
        </Text>
      </View>

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

      <Button
        onPress={handleSubmit((values) => setPasswordMutation.mutate(values))}
        loading={setPasswordMutation.isPending}
      >
        Save and continue
      </Button>
    </View>
  );
}
