import { useRef } from "react";
import { View, Text, Modal, Pressable, Share } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { hapticTap } from "../lib/haptics";

interface InviteQrModalProps {
  visible: boolean;
  name: string;
  code: string | null;
  /** "Resident" / "Guard" — used in the share text only. */
  roleLabel: string;
  onClose: () => void;
}

/**
 * "Invite sent" sheet an admin hands to a new resident/guard. They either scan the QR
 * or type the code on the Activate Account screen, then pick their own password.
 * Matches the Obsidian & Amber Stitch mockup.
 */
export function InviteQrModal({ visible, name, code, roleLabel, onClose }: InviteQrModalProps) {
  const firstName = name.trim().split(/\s+/)[0] || name;
  const cardRef = useRef<View>(null);

  const shareText =
    `Welcome to PORTL, ${name}!\n\n` +
    `Open the PORTL app, tap "Activate account" and enter this code to set your password:\n\n${code}`;

  async function share() {
    if (!code) return;
    hapticTap();
    // Capture the white QR card as a PNG and share the image, so the invitee can just
    // scan it. Falls back to plain text if capture/sharing isn't available.
    try {
      const uri = await captureRef(cardRef, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: `PORTL invite for ${firstName}`,
        });
        return;
      }
    } catch {
      // fall through to text share
    }
    await Share.share({ message: shareText });
  }

  return (
    <Modal visible={visible && !!code} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
        <View
          className="w-full items-center"
          style={{
            backgroundColor: "#1A1A1A",
            borderRadius: 28,
            borderWidth: 1,
            borderColor: "#333333",
            paddingHorizontal: 24,
            paddingVertical: 28,
          }}
        >
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityLabel="Close"
            accessibilityRole="button"
            style={{ position: "absolute", top: 18, right: 18 }}
          >
            <MaterialIcons name="close" size={24} color="#C4C4C4" />
          </Pressable>

          <Text className="font-extrabold text-on-surface" style={{ fontSize: 26, letterSpacing: -0.5 }}>
            Invite sent
          </Text>
          <Text className="mt-2 text-center text-body-md text-on-surface-variant" style={{ paddingHorizontal: 8 }}>
            Share this code with {firstName} to activate their account
          </Text>

          {code && (
            <View
              ref={cardRef}
              collapsable={false}
              className="mt-6 items-center"
              style={{ backgroundColor: "#FFFFFF", borderRadius: 20, paddingHorizontal: 24, paddingVertical: 22 }}
            >
              <QRCode value={code} size={176} backgroundColor="#FFFFFF" color="#0D0D0D" />
              <Text
                style={{ marginTop: 16, fontSize: 11, letterSpacing: 2, color: "#6B6B6B", fontWeight: "700" }}
              >
                PORTL INVITE CODE
              </Text>
              <Text
                selectable
                style={{ marginTop: 2, fontSize: 26, letterSpacing: 5, color: "#0D0D0D", fontWeight: "800" }}
              >
                {code}
              </Text>
            </View>
          )}

          <Pressable
            onPress={share}
            className="mt-6 h-14 w-full flex-row items-center justify-center gap-2 rounded-full"
            style={{ backgroundColor: "#F5821F" }}
            accessibilityLabel={`Share invite QR with ${roleLabel}`}
            accessibilityRole="button"
          >
            <MaterialIcons name="ios-share" size={20} color="#0D0D0D" />
            <Text className="text-body-lg font-bold" style={{ color: "#0D0D0D" }}>
              Share QR
            </Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            className="mt-3 h-14 w-full items-center justify-center rounded-full"
            style={{ backgroundColor: "#242424", borderWidth: 1, borderColor: "#333333" }}
            accessibilityLabel="Done"
            accessibilityRole="button"
          >
            <Text className="text-body-lg font-bold text-on-surface">Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
