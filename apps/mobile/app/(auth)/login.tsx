import { useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { loginInputSchema } from "@repo/services/auth/model";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../stores/auth-store";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError, hapticTap } from "../../lib/haptics";
import { Input } from "../../components/ui/input";
import { shadowCard, shadowElevated } from "../../lib/shadows";

interface LoginForm {
  identifier: string;
  password: string;
}

type Tab = "signIn" | "signUp";

const CODE_PATTERN = /[A-HJ-NP-Z2-9]{8}/;
const FIELD_STYLE = { backgroundColor: "#242424", borderWidth: 0 } as const;

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setSession = useAuthStore((s) => s.setSession);
  const showToast = useUiStore((s) => s.showToast);

  const [tab, setTab] = useState<Tab>("signIn");
  const [showPassword, setShowPassword] = useState(false);

  // ---- Sign In ----
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

  // ---- Sign Up (activate with invite) ----
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanHandledRef = useRef(false);

  const normalizedCode = code.trim().toUpperCase();
  const codeReady = normalizedCode.length >= 8;

  const inviteQuery = trpc.auth.lookupInvite.useQuery(
    { code: normalizedCode },
    { enabled: codeReady && tab === "signUp", retry: false },
  );
  const invite = inviteQuery.data;

  const claimMutation = trpc.auth.claimAccount.useMutation({
    onSuccess: (data) => {
      hapticSuccess();
      setSession(data);
      showToast("Account activated — welcome to PORTL", "success");
      router.replace("/");
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  async function openScanner() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        showToast("Camera access is needed to scan the invite QR", "error");
        return;
      }
    }
    scanHandledRef.current = false;
    setScanning(true);
  }

  function onBarcode(data: string) {
    if (scanHandledRef.current) return;
    const match = data.toUpperCase().match(CODE_PATTERN);
    if (!match) {
      hapticError();
      showToast("That QR isn't a PORTL invite", "error");
      return;
    }
    scanHandledRef.current = true;
    setScanning(false);
    hapticSuccess();
    setCode(match[0]);
  }

  function submitSignUp() {
    if (password !== confirm) {
      setConfirmError("Passwords don't match");
      return;
    }
    setConfirmError(null);
    claimMutation.mutate({ code: normalizedCode, password });
  }

  const canSubmitSignUp = !!invite && password.length >= 6 && confirm.length >= 6;

  function switchTab(next: Tab) {
    if (next === tab) return;
    hapticTap();
    setTab(next);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6"
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 120 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-[400px] self-center">
          {/* Brand lockup — P-door mark + PORTL wordmark from the app icon */}
          <View className="items-center">
            <View
              className="items-center justify-center"
              style={[
                { width: 96, height: 96, borderRadius: 26, backgroundColor: "#1A1A1A" },
                shadowElevated,
              ]}
            >
              <Image
                source={require("../../assets/portl-mark.png")}
                style={{ width: 52, height: 60 }}
                resizeMode="contain"
              />
            </View>
            <Image
              source={require("../../assets/portl-wordmark.png")}
              style={{ width: 176, height: 44, marginTop: 18 }}
              resizeMode="contain"
              accessibilityLabel="PORTL Society"
            />
            <Text className="mt-2 text-body-md text-on-surface-variant">Your society, in one place</Text>
          </View>

          {/* Get started */}
          <View className="mt-9 gap-1">
            <Text className="text-headline-md font-extrabold text-on-surface">Get started</Text>
            <Text className="text-body-md text-on-surface-variant">
              Sign in to your account or activate a new one
            </Text>
          </View>

          {/* Segmented toggle */}
          <View
            className="mt-4 flex-row rounded-full p-1"
            style={{ backgroundColor: "#1A1A1A" }}
          >
            {(["signIn", "signUp"] as const).map((t) => {
              const active = tab === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => switchTab(t)}
                  className="flex-1 items-center justify-center rounded-full py-3"
                  style={active ? { backgroundColor: "#F5821F" } : undefined}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t === "signIn" ? "Sign In" : "Sign Up"}
                >
                  <Text
                    className="text-body-md font-bold"
                    style={{ color: active ? "#FFFFFF" : "#8A8A8A" }}
                  >
                    {t === "signIn" ? "Sign In" : "Sign Up"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Panel */}
          <View className="mt-4 gap-4 bg-surface p-6" style={[{ borderRadius: 24 }, shadowCard]}>
            {tab === "signIn" ? (
              <>
                <View className="gap-2">
                  <Text className="text-body-md font-bold text-on-surface">Email or Phone</Text>
                  <Controller
                    control={control}
                    name="identifier"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        autoCapitalize="none"
                        // iOS autocorrect happily "fixes" an email address into
                        // something that no longer matches an account, and the
                        // failure surfaces only as "Invalid credentials".
                        autoCorrect={false}
                        spellCheck={false}
                        textContentType="username"
                        keyboardType="email-address"
                        placeholder="Enter your email"
                        onBlur={onBlur}
                        onChangeText={(text) => onChange(text.trim())}
                        value={value}
                        error={errors.identifier?.message}
                        leftElement={<MaterialIcons name="person-outline" size={20} color="#8A8A8A" />}
                        style={FIELD_STYLE}
                      />
                    )}
                  />
                </View>
                <View className="gap-2">
                  <Text className="text-body-md font-bold text-on-surface">Password</Text>
                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        secureTextEntry={!showPassword}
                        placeholder="Enter your password"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        error={errors.password?.message}
                        leftElement={<MaterialIcons name="lock-outline" size={20} color="#8A8A8A" />}
                        style={FIELD_STYLE}
                        rightElement={
                          <Pressable
                            accessibilityLabel="Toggle password visibility"
                            onPress={() => setShowPassword((v) => !v)}
                            hitSlop={8}
                          >
                            <MaterialIcons
                              name={showPassword ? "visibility" : "visibility-off"}
                              size={20}
                              color="#8A8A8A"
                            />
                          </Pressable>
                        }
                      />
                    )}
                  />
                </View>

                <Pressable
                  className="self-end"
                  hitSlop={8}
                  onPress={() => showToast("Contact your society admin to reset your password", "info")}
                >
                  <Text className="text-body-md font-bold text-primary-container">Forgot password?</Text>
                </Pressable>

                <Pressable
                  onPress={handleSubmit((values) => loginMutation.mutate(values))}
                  disabled={loginMutation.isPending}
                  className="mt-1 h-14 flex-row items-center justify-center gap-2 rounded-full"
                  style={{ backgroundColor: "#F5821F" }}
                  accessibilityLabel="Sign in"
                  accessibilityRole="button"
                >
                  <Text className="text-body-lg font-bold" style={{ color: "#FFFFFF" }}>
                    {loginMutation.isPending ? "Signing In..." : "Sign In"}
                  </Text>
                  {!loginMutation.isPending && <MaterialIcons name="arrow-forward" size={20} color="#fff" />}
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={openScanner}
                  className="h-14 flex-row items-center justify-center gap-2 rounded-full"
                  style={{ backgroundColor: "#242424" }}
                  accessibilityLabel="Scan invite QR code"
                  accessibilityRole="button"
                >
                  <MaterialIcons name="qr-code-scanner" size={20} color="#F5821F" />
                  <Text className="text-body-md font-bold text-primary-container">Scan Invite QR</Text>
                </Pressable>

                <View className="flex-row items-center gap-3">
                  <View className="h-px flex-1" style={{ backgroundColor: "#333333" }} />
                  <Text className="text-body-sm text-text-muted">or enter code</Text>
                  <View className="h-px flex-1" style={{ backgroundColor: "#333333" }} />
                </View>

                <View className="gap-2">
                  <Text className="text-body-md font-bold text-on-surface">Invite Code</Text>
                  <Input
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder="ABCD2345"
                    value={code}
                    onChangeText={setCode}
                    leftElement={<MaterialIcons name="vpn-key" size={20} color="#8A8A8A" />}
                    style={FIELD_STYLE}
                  />
                  {codeReady && inviteQuery.isLoading && (
                    <View className="flex-row items-center gap-2">
                      <ActivityIndicator size="small" color="#F5821F" />
                      <Text className="text-body-sm text-text-muted">Checking code…</Text>
                    </View>
                  )}
                  {codeReady && inviteQuery.isError && (
                    <Text className="text-body-sm text-status-red">{getErrorMessage(inviteQuery.error)}</Text>
                  )}
                </View>

                {invite && (
                  <>
                    <View
                      className="flex-row items-center gap-3 rounded-2xl p-3"
                      style={{ backgroundColor: "#242424" }}
                    >
                      <MaterialIcons name="verified-user" size={22} color="#27C96D" />
                      <View className="min-w-0 flex-1">
                        <Text className="text-body-md font-extrabold text-on-surface" numberOfLines={1}>
                          {invite.fullName}
                        </Text>
                        <Text className="text-body-sm text-text-muted" numberOfLines={1}>
                          {invite.role === "guard" ? "Security Guard" : "Resident"}
                          {invite.flatNumber ? ` · Flat ${invite.flatNumber}` : ""}
                          {invite.societyName ? ` · ${invite.societyName}` : ""}
                        </Text>
                      </View>
                    </View>

                    <View className="gap-2">
                      <Text className="text-body-md font-bold text-on-surface">Create Password</Text>
                      <Input
                        secureTextEntry={!showNewPassword}
                        placeholder="At least 6 characters"
                        value={password}
                        onChangeText={setPassword}
                        leftElement={<MaterialIcons name="lock-outline" size={20} color="#8A8A8A" />}
                        style={FIELD_STYLE}
                        rightElement={
                          <Pressable
                            accessibilityLabel="Toggle password visibility"
                            onPress={() => setShowNewPassword((v) => !v)}
                            hitSlop={8}
                          >
                            <MaterialIcons
                              name={showNewPassword ? "visibility" : "visibility-off"}
                              size={20}
                              color="#8A8A8A"
                            />
                          </Pressable>
                        }
                      />
                    </View>

                    <View className="gap-2">
                      <Text className="text-body-md font-bold text-on-surface">Confirm Password</Text>
                      <Input
                        secureTextEntry={!showNewPassword}
                        placeholder="Re-enter your password"
                        value={confirm}
                        onChangeText={(v) => {
                          setConfirm(v);
                          if (confirmError) setConfirmError(null);
                        }}
                        error={confirmError ?? undefined}
                        leftElement={<MaterialIcons name="password" size={20} color="#8A8A8A" />}
                        style={FIELD_STYLE}
                      />
                    </View>

                    <Text className="text-body-sm text-text-muted">
                      You'll sign in with {invite.phone} (or your email) and this password.
                    </Text>

                    <Pressable
                      onPress={submitSignUp}
                      disabled={!canSubmitSignUp || claimMutation.isPending}
                      className="mt-1 h-14 flex-row items-center justify-center gap-2 rounded-full"
                      style={{ backgroundColor: canSubmitSignUp ? "#F5821F" : "#7A5320" }}
                      accessibilityLabel="Activate account"
                      accessibilityRole="button"
                    >
                      <Text className="text-body-lg font-bold" style={{ color: "#FFFFFF" }}>
                        {claimMutation.isPending ? "Activating…" : "Activate & Sign In"}
                      </Text>
                      {!claimMutation.isPending && <MaterialIcons name="arrow-forward" size={20} color="#fff" />}
                    </Pressable>
                  </>
                )}

                {!invite && (
                  <Text className="text-center text-body-sm text-text-muted">
                    Portl accounts are created by your society admin. Enter the invite code they shared to activate
                    yours.
                  </Text>
                )}
              </>
            )}
          </View>

          {/* Create a new society (admin) */}
          <Pressable
            onPress={() => router.push("/(auth)/register-admin")}
            className="mt-5 flex-row items-center justify-center gap-1.5"
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Create an admin account for a new society"
          >
            <Text className="text-body-md text-on-surface-variant">New society?</Text>
            <Text className="text-body-md font-bold text-primary-container">Create an admin account</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={scanning} animationType="slide" onRequestClose={() => setScanning(false)}>
        <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanning ? (e) => onBarcode(e.data) : undefined}
          />
          <View className="absolute inset-0 items-center justify-center" pointerEvents="box-none">
            <View style={{ width: 240, height: 240, borderRadius: 24, borderWidth: 3, borderColor: "#F5821F" }} />
            <Text
              className="mt-6 text-center text-body-lg font-bold text-white"
              style={{ textShadowColor: "#000", textShadowRadius: 6 }}
            >
              Point at the invite QR from your admin
            </Text>
          </View>
          <Pressable
            onPress={() => setScanning(false)}
            className="absolute left-5 h-11 w-11 items-center justify-center rounded-full"
            style={{ top: insets.top + 6, backgroundColor: "rgba(0,0,0,0.6)" }}
            accessibilityLabel="Close scanner"
            accessibilityRole="button"
          >
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
