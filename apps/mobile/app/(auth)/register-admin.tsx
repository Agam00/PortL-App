import { useState } from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../stores/auth-store";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { Input } from "../../components/ui/input";
import { shadowCard } from "../../lib/shadows";

const FIELD_STYLE = { backgroundColor: "#242424", borderWidth: 0 } as const;

export default function RegisterAdmin() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setSession = useAuthStore((s) => s.setSession);
  const showToast = useUiStore((s) => s.showToast);

  const [societyName, setSocietyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      hapticSuccess();
      setSession(data);
      showToast("Society created — welcome to PORTL", "success");
      router.replace("/");
    },
    onError: (e) => {
      hapticError();
      showToast(getErrorMessage(e), "error");
    },
  });

  function submit() {
    if (!societyName.trim() || !fullName.trim() || !email.trim() || !phone.trim() || !password) {
      setError("Please fill in every field.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    registerMutation.mutate({
      societyName: societyName.trim(),
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    });
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pb-2" style={{ paddingTop: insets.top + 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Back" accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={24} color="#F5F5F5" />
        </Pressable>
        <Text className="text-headline-lg font-extrabold text-on-surface">Create Admin Account</Text>
      </View>

      <ScrollView
        contentContainerClassName="px-6"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 120 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-4 text-body-md text-on-surface-variant">
          Set up a new society and get an admin account to manage it. You can invite residents and guards afterwards.
        </Text>

        <View className="gap-4 bg-surface p-6" style={[{ borderRadius: 24 }, shadowCard]}>
          <View className="gap-2">
            <Text className="text-body-md font-bold text-on-surface">Society Name</Text>
            <Input
              placeholder="e.g. Palm Meadows"
              value={societyName}
              onChangeText={(v) => {
                setSocietyName(v);
                if (error) setError(null);
              }}
              leftElement={<MaterialIcons name="apartment" size={20} color="#8A8A8A" />}
              style={FIELD_STYLE}
            />
          </View>

          <View className="gap-2">
            <Text className="text-body-md font-bold text-on-surface">Your Full Name</Text>
            <Input
              placeholder="e.g. Asha Sharma"
              value={fullName}
              onChangeText={setFullName}
              leftElement={<MaterialIcons name="person-outline" size={20} color="#8A8A8A" />}
              style={FIELD_STYLE}
            />
          </View>

          <View className="gap-2">
            <Text className="text-body-md font-bold text-on-surface">Email</Text>
            <Input
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              leftElement={<MaterialIcons name="mail-outline" size={20} color="#8A8A8A" />}
              style={FIELD_STYLE}
            />
          </View>

          <View className="gap-2">
            <Text className="text-body-md font-bold text-on-surface">Phone</Text>
            <Input
              placeholder="+91XXXXXXXXXX"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              leftElement={<MaterialIcons name="phone" size={20} color="#8A8A8A" />}
              style={FIELD_STYLE}
            />
          </View>

          <View className="gap-2">
            <Text className="text-body-md font-bold text-on-surface">Password</Text>
            <Input
              secureTextEntry={!showPassword}
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              leftElement={<MaterialIcons name="lock-outline" size={20} color="#8A8A8A" />}
              style={FIELD_STYLE}
              rightElement={
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} accessibilityLabel="Toggle password visibility">
                  <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={20} color="#8A8A8A" />
                </Pressable>
              }
            />
          </View>

          <View className="gap-2">
            <Text className="text-body-md font-bold text-on-surface">Confirm Password</Text>
            <Input
              secureTextEntry={!showPassword}
              placeholder="Re-enter your password"
              value={confirm}
              onChangeText={(v) => {
                setConfirm(v);
                if (error) setError(null);
              }}
              leftElement={<MaterialIcons name="password" size={20} color="#8A8A8A" />}
              style={FIELD_STYLE}
            />
          </View>

          {error && <Text className="text-body-sm text-status-red">{error}</Text>}

          <Pressable
            onPress={submit}
            disabled={registerMutation.isPending}
            className="mt-1 h-14 flex-row items-center justify-center gap-2 rounded-full"
            style={{ backgroundColor: "#F5821F" }}
            accessibilityLabel="Create admin account"
            accessibilityRole="button"
          >
            <Text className="text-body-lg font-bold" style={{ color: "#FFFFFF" }}>
              {registerMutation.isPending ? "Creating..." : "Create Account"}
            </Text>
            {!registerMutation.isPending && <MaterialIcons name="arrow-forward" size={20} color="#fff" />}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
