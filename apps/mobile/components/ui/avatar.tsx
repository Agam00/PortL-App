import { View, Text, Image } from "react-native";

function initialsFrom(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Avatar({
  name,
  imageUrl,
  size = 40,
}: {
  name: string;
  imageUrl?: string | null;
  size?: number;
}) {
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="items-center justify-center bg-surface-container-high"
    >
      <Text className="font-medium text-on-surface-variant" style={{ fontSize: size * 0.4 }}>
        {initialsFrom(name)}
      </Text>
    </View>
  );
}
