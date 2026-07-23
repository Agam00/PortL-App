import { View, Text, Image, Modal, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

/**
 * Full-screen viewer for a visitor's captured photo. Guards and residents both use
 * this to open a visitor's photo (from the In-Out list or a request card) and see it
 * clearly. Renders nothing when `uri` is null.
 */
export function PhotoViewerModal({
  uri,
  title,
  subtitle,
  onClose,
}: {
  uri: string | null;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const size = Math.min(Dimensions.get("window").width - 32, 420);

  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 items-center justify-center px-4"
        style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
        onPress={onClose}
        accessibilityLabel="Close photo"
        accessibilityRole="button"
      >
        <Pressable
          onPress={() => {}}
          style={{ position: "absolute", top: insets.top + 8, right: 16, zIndex: 10 }}
        >
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close" accessibilityRole="button">
            <MaterialIcons name="close" size={30} color="#FFFFFF" />
          </Pressable>
        </Pressable>

        {uri && (
          <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: 20 }}
            resizeMode="cover"
          />
        )}

        {(title || subtitle) && (
          <View className="items-center gap-1 pt-5">
            {title && <Text className="text-headline-md font-extrabold text-white">{title}</Text>}
            {subtitle && <Text className="text-body-md" style={{ color: "#B9B4C4" }}>{subtitle}</Text>}
          </View>
        )}
      </Pressable>
    </Modal>
  );
}
