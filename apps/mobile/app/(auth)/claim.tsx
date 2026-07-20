import { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { trpc } from "../../lib/trpc";
import { useAuthStore } from "../../stores/auth-store";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { Input } from "../../components/ui/input";
import { shadowCard } from "../../lib/shadows";

const CODE_PATTERN = /[A-HJ-NP-Z2-9]{8}/;

export default function ClaimAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setSession = useAuthStore((s) => s.setSession);
  const showToast = useUiStore((s) => s.showToast);

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanHandledRef = useRef(false);

  const normalizedCode = code.trim().toUpperCase();
  const codeReady = normalizedCode.length >= 8;

  // Confirms who the code belongs to before they commit to a password.
  const inviteQuery = trpc.auth.lookupInvite.useQuery(
    { code: normalizedCode },
    { enabled: codeReady, retry: false },
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

  function submit() {
    if (password !== confirm) {
      setConfirmError("Passwords don't match");
      return;
    }
    setConfirmError(null);
    claimMutation.mutate({ code: normalizedCode, password });
  }

  const canSubmit = !!invite && password.length >= 6 && confirm.length >= 6;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-12" keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-[400px] self-center">
          <Text className="text-center text-headline-xl font-extrabold tracking-tight text-primary-container">
            PORTL
          </Text>
          <View className="mt-6 gap-2">
            <Text className="text-center text-headline-lg font-extrabold text-on-surface">Activate Account</Text>
            <Text className="text-center text-body-md text-on-surface-variant">
              Scan the QR your society admin gave you, or type the invite code.
            </Text>
          </View>

          <View className="mt-8 gap-4 bg-surface p-6" style={[{ borderRadius: 24 }, shadowCard]}>
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
                style={{ backgroundColor: "#242424", borderWidth: 0 }}
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
                <View className="flex-row items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: "#242424" }}>
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
                    secureTextEntry
                    placeholder="At least 6 characters"
                    value={password}
                    onChangeText={setPassword}
                    leftElement={<MaterialIcons name="lock-outline" size={20} color="#8A8A8A" />}
                    style={{ backgroundColor: "#242424", borderWidth: 0 }}
                  />
                </View>

                <View className="gap-2">
                  <Text className="text-body-md font-bold text-on-surface">Confirm Password</Text>
                  <Input
                    secureTextEntry
                    placeholder="Re-enter your password"
                    value={confirm}
                    onChangeText={(v) => {
                      setConfirm(v);
                      if (confirmError) setConfirmError(null);
                    }}
                    error={confirmError ?? undefined}
                    leftElement={<MaterialIcons name="password" size={20} color="#8A8A8A" />}
                    style={{ backgroundColor: "#242424", borderWidth: 0 }}
                  />
                </View>

                <Text className="text-body-sm text-text-muted">
                  You'll sign in with {invite.phone} (or your email) and this password.
                </Text>

                <Pressable
                  onPress={submit}
                  disabled={!canSubmit || claimMutation.isPending}
                  className="mt-1 h-14 flex-row items-center justify-center gap-2 rounded-full"
                  style={{ backgroundColor: canSubmit ? "#F5821F" : "#7A5320" }}
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
          </View>

          <Pressable className="mt-8 self-center" hitSlop={8} onPress={() => router.replace("/(auth)/login")}>
            <Text className="text-body-md font-bold text-primary-container">Back to sign in</Text>
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
            <View
              style={{ width: 240, height: 240, borderRadius: 24, borderWidth: 3, borderColor: "#F5821F" }}
            />
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
