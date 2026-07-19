import { useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useUiStore } from "../../stores/ui-store";
import { hapticSuccess, hapticError } from "../../lib/haptics";

export default function GuardScan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useUiStore((s) => s.showToast);
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState(true);
  const handledRef = useRef(false);

  function onScan(data: string) {
    if (handledRef.current) return;
    const match = data.match(/\d{6}/);
    if (!match) {
      hapticError();
      showToast("That's not a valid gate pass", "error");
      return;
    }
    handledRef.current = true;
    setActive(false);
    hapticSuccess();
    // Hand the code to the gate screen, which runs the lookup + entry flow.
    router.replace(`/(guard)/gate?code=${match[0]}`);
  }

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      {!permission ? (
        <View className="flex-1" />
      ) : !permission.granted ? (
        <View className="flex-1 items-center justify-center gap-4 px-8" style={{ paddingTop: insets.top }}>
          <MaterialIcons name="photo-camera" size={48} color="#F5821F" />
          <Text className="text-center text-headline-md font-extrabold text-on-surface">Camera access needed</Text>
          <Text className="text-center text-body-md text-text-muted">
            Allow camera access to scan a visitor's gate pass QR code.
          </Text>
          <Pressable
            onPress={requestPermission}
            className="mt-2 h-12 items-center justify-center rounded-full px-8"
            style={{ backgroundColor: "#F5821F" }}
            accessibilityLabel="Grant camera access"
            accessibilityRole="button"
          >
            <Text className="text-body-md font-bold" style={{ color: "#141118" }}>
              Grant Access
            </Text>
          </Pressable>
          <Pressable onPress={() => router.replace("/(guard)/gate")} hitSlop={8} accessibilityRole="button">
            <Text className="text-body-md font-bold text-primary">Use keypad instead</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={active ? (e) => onScan(e.data) : undefined}
          />

          {/* Overlay */}
          <View className="absolute inset-0 items-center justify-center" pointerEvents="box-none">
            <View
              style={{ width: 240, height: 240, borderRadius: 24, borderWidth: 3, borderColor: "#F5821F", backgroundColor: "transparent" }}
            />
            <Text className="mt-6 text-center text-body-lg font-bold text-white" style={{ textShadowColor: "#000", textShadowRadius: 6 }}>
              Point at the visitor's gate pass
            </Text>
          </View>

          {/* Top bar */}
          <View className="absolute left-0 right-0 flex-row items-center justify-between px-5" style={{ top: insets.top + 6 }}>
            <Pressable
              onPress={() => router.replace("/(guard)/gate")}
              hitSlop={8}
              className="items-center justify-center rounded-full"
              style={{ width: 40, height: 40, backgroundColor: "rgba(0,0,0,0.5)" }}
              accessibilityLabel="Back"
              accessibilityRole="button"
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </Pressable>
            <Text className="text-body-lg font-bold text-white" style={{ textShadowColor: "#000", textShadowRadius: 6 }}>
              Scan Pass
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Keypad fallback */}
          <Pressable
            onPress={() => router.replace("/(guard)/gate")}
            className="absolute left-5 right-5 flex-row items-center justify-center gap-2 rounded-full"
            style={{ bottom: insets.bottom + 20, height: 52, backgroundColor: "rgba(20,17,24,0.9)" }}
            accessibilityLabel="Enter code manually"
            accessibilityRole="button"
          >
            <MaterialIcons name="dialpad" size={20} color="#F5821F" />
            <Text className="text-body-md font-bold text-on-surface">Enter code manually</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
