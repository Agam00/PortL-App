import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

/** Captures a photo, resizes it small, and returns a base64 data URL — or null if cancelled/denied. */
export async function captureVisitorPhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.6,
  });
  if (result.canceled || !result.assets[0]) return null;

  const manipulated = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 400 } }],
    { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );

  if (!manipulated.base64) return null;
  return `data:image/jpeg;base64,${manipulated.base64}`;
}
