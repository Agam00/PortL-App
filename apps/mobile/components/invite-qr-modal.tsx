import { View, Text, Modal, Pressable, Share } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { hapticTap } from "../lib/haptics";
import { shadowCard } from "../lib/shadows";

interface InviteQrModalProps {
  visible: boolean;
  name: string;
  code: string | null;
  /** "Resident" / "Guard" — used in the share text only. */
  roleLabel: string;
  onClose: () => void;
}

/**
 * Shows the invite code an admin hands to a new resident/guard. They either scan
 * the QR or type the code on the Activate Account screen, then pick their own password.
 */
export function InviteQrModal({ visible, name, code, roleLabel, onClose }: InviteQrModalProps) {
  async function share() {
    if (!code) return;
    hapticTap();
    await Share.share({
      message:
        `Welcome to PORTL, ${name}!\n\n` +
        `Open the PORTL app, tap "Activate account" and enter this code to set your password:\n\n${code}`,
    });
  }

  return (
    <Modal visible={visible && !!code} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
        <View className="w-full items-center gap-4 bg-surface p-6" style={[{ borderRadius: 24 }, shadowCard]}>
          <View className="w-full flex-row items-start justify-between">
            <View className="min-w-0 flex-1">
              <Text className="text-headline-md font-extrabold text-on-surface" numberOfLines={1}>
                {name}
              </Text>
              <Text className="text-body-sm text-text-muted">Invite code — account not activated yet</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close" accessibilityRole="button">
              <MaterialIcons name="close" size={22} color="#8A8A8A" />
            </Pressable>
          </View>

          {code && (
            <>
              <View className="items-center justify-center p-4" style={{ backgroundColor: "#FFFFFF", borderRadius: 16 }}>
                <QRCode value={code} size={184} backgroundColor="#FFFFFF" color="#0D0D0D" />
              </View>

              <Text
                className="text-headline-lg font-extrabold text-primary-container"
                style={{ letterSpacing: 4 }}
                selectable
              >
                {code}
              </Text>
            </>
          )}

          <Text className="text-center text-body-sm text-text-muted">
            They scan this (or type the code) on the app's Activate Account screen to set their own password.
          </Text>

          <Pressable
            onPress={share}
            className="h-12 w-full flex-row items-center justify-center gap-2 rounded-full"
            style={{ backgroundColor: "#F5821F" }}
            accessibilityLabel={`Share invite code with ${name}`}
            accessibilityRole="button"
          >
            <MaterialIcons name="ios-share" size={18} color="#FFFFFF" />
            <Text className="text-body-md font-bold" style={{ color: "#FFFFFF" }}>
              Share with {roleLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
