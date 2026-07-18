import { useState } from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { useAuthStore } from "../../stores/auth-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError, hapticTap } from "../../lib/haptics";
import { PressableScale } from "../../components/ui/pressable-scale";
import { shadowCard } from "../../lib/shadows";

const NEW_VISITOR: { label: string; type: string; img: ImageSourcePropType }[] = [
  { label: "Guest", type: "guest", img: require("../../assets/characters/guest.png") },
  { label: "Delivery", type: "delivery", img: require("../../assets/characters/delivery.png") },
  { label: "Service", type: "service", img: require("../../assets/characters/service.png") },
  { label: "Cab", type: "cab", img: require("../../assets/characters/cab.png") },
];

const TYPE_LABEL: Record<string, string> = { guest: "Guest", delivery: "Delivery", cab: "Cab", service: "Service", other: "Visitor" };

export default function GuardGate() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const showToast = useUiStore((s) => s.showToast);
  const [code, setCode] = useState("");

  const lookupQuery = trpc.visitors.lookupByPassCode.useQuery({ code }, { enabled: code.length === 6, retry: false });

  const markEntryMutation = trpc.visitors.markEntry.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Entry marked ✓", "success");
      setCode("");
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });
  const markExitMutation = trpc.visitors.markExit.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Exit marked ✓", "success");
      setCode("");
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  function pressDigit(d: string) {
    if (code.length >= 6) return;
    hapticTap();
    setCode(code + d);
  }
  function backspace() {
    hapticTap();
    setCode(code.slice(0, -1));
  }

  const found = lookupQuery.data;
  const lookupError = code.length === 6 && lookupQuery.isError ? getErrorMessage(lookupQuery.error) : null;

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      {/* Dark header: location + Home / In-Out / Settings */}
      <View style={{ backgroundColor: "#141118", paddingTop: insets.top + 10, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <Text className="pb-4 text-center text-body-md font-bold" style={{ color: "#B9B4C4" }}>
          Main Gate · {user?.fullName?.split(" ")[0] ?? "Guard"}
        </Text>
        <View className="flex-row justify-around px-6 pb-6">
          <HeaderTab icon="home-filled" label="Home" active onPress={() => {}} />
          <HeaderTab icon="swap-vert" label="In-Out" onPress={() => router.push("/(guard)/history")} />
          <HeaderTab icon="settings" label="Settings" onPress={() => router.push("/(guard)/profile")} />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between", paddingTop: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-6">
        {/* Code display — single wide pill with 6 evenly-spaced slots */}
        <View
          className="mx-5 flex-row items-center justify-around rounded-2xl px-6"
          style={{ backgroundColor: "#1A1A1A", height: 60 }}
        >
          {Array.from({ length: 6 }).map((_, i) =>
            code[i] ? (
              <Text key={i} style={{ fontSize: 24, fontWeight: "800", color: "#F5F5F5" }}>
                {code[i]}
              </Text>
            ) : (
              <View
                key={i}
                style={{ width: 20, height: 4, borderRadius: 2, backgroundColor: code.length === i ? "#F5821F" : "#4A4A4A" }}
              />
            ),
          )}
        </View>

        {/* Lookup result / error */}
        {code.length === 6 && (
          <View className="mx-4">
            {lookupQuery.isLoading ? (
              <View className="items-center rounded-2xl bg-surface p-4" style={shadowCard}>
                <Text className="text-body-md text-text-muted">Looking up…</Text>
              </View>
            ) : found ? (
              <View className="gap-3 rounded-2xl bg-surface p-4" style={shadowCard}>
                <View className="flex-row items-center gap-3">
                  <View className="items-center justify-center rounded-full" style={{ width: 44, height: 44, backgroundColor: "#242424" }}>
                    <MaterialIcons name="verified-user" size={22} color="#27C96D" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-body-lg font-extrabold text-on-surface" numberOfLines={1}>
                      {found.name}
                    </Text>
                    <Text className="text-body-sm text-text-muted">
                      {TYPE_LABEL[found.type] ?? "Visitor"} · Flat {found.flatNumber ?? "—"} · {found.status.replace("_", " ")}
                    </Text>
                  </View>
                </View>
                {found.status === "approved" ? (
                  <Pressable
                    onPress={() => markEntryMutation.mutate({ visitorId: found.id })}
                    disabled={markEntryMutation.isPending}
                    className="items-center justify-center rounded-full py-3"
                    style={{ backgroundColor: "#F5821F" }}
                    accessibilityLabel="Mark entry"
                    accessibilityRole="button"
                  >
                    <Text className="text-body-md font-bold" style={{ color: "#141118" }}>
                      {markEntryMutation.isPending ? "Marking…" : "Mark Entry"}
                    </Text>
                  </Pressable>
                ) : found.status === "checked_in" ? (
                  <Pressable
                    onPress={() => markExitMutation.mutate({ visitorId: found.id })}
                    disabled={markExitMutation.isPending}
                    className="items-center justify-center rounded-full py-3"
                    style={{ backgroundColor: "#242424" }}
                    accessibilityLabel="Mark exit"
                    accessibilityRole="button"
                  >
                    <Text className="text-body-md font-bold text-on-surface">{markExitMutation.isPending ? "Marking…" : "Mark Exit"}</Text>
                  </Pressable>
                ) : (
                  <Text className="text-center text-body-sm text-text-muted">Status: {found.status.replace("_", " ")}</Text>
                )}
              </View>
            ) : (
              <View className="flex-row items-center justify-between rounded-2xl bg-surface p-4" style={shadowCard}>
                <View className="min-w-0 flex-1 flex-row items-center gap-2">
                  <MaterialIcons name="error-outline" size={20} color="#FF5F5F" />
                  <Text className="min-w-0 flex-1 text-body-sm text-status-red" numberOfLines={2}>
                    {lookupError ?? "No visitor found for this code"}
                  </Text>
                </View>
                <Pressable onPress={() => setCode("")} hitSlop={8} accessibilityLabel="Clear" accessibilityRole="button">
                  <Text className="text-body-sm font-bold text-primary">Clear</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Keypad */}
        <View className="gap-6 px-5 pt-1">
          {[["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]].map((row) => (
            <View key={row[0]} className="flex-row justify-around">
              {row.map((d) => (
                <Key key={d} onPress={() => pressDigit(d)}>
                  <Text className="font-bold text-on-surface" style={{ fontSize: 30 }}>
                    {d}
                  </Text>
                </Key>
              ))}
            </View>
          ))}
          <View className="flex-row justify-around">
            <Key onPress={() => router.push("/(guard)/check-preapproved")} bg="#F5821F">
              <MaterialIcons name="qr-code-scanner" size={28} color="#141118" />
            </Key>
            <Key onPress={() => pressDigit("0")}>
              <Text className="font-bold text-on-surface" style={{ fontSize: 30 }}>
                0
              </Text>
            </Key>
            <Key onPress={backspace}>
              <MaterialIcons name="backspace" size={24} color="#C4C4C4" />
            </Key>
          </View>
        </View>
        </View>

        {/* Add new visitor — horizontal scroll like the resident cards */}
        <View className="gap-3 pt-1">
          <Text className="text-center text-label-caps font-bold uppercase tracking-widest text-text-muted">Add New Visitor</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4 px-4 pb-1">
            {NEW_VISITOR.map((v) => (
              <PressableScale
                key={v.type}
                scaleTo={0.96}
                onPress={() => router.push(`/(guard)/visitors?type=${v.type}`)}
                className="justify-between rounded-2xl bg-surface p-4"
                style={[{ width: 150, height: 190 }, shadowCard]}
                accessibilityLabel={`Add ${v.label}`}
                accessibilityRole="button"
              >
                <Text className="text-body-lg font-extrabold text-on-surface">{v.label}</Text>
                <Image source={v.img} style={{ width: 96, height: 96, alignSelf: "flex-end" }} resizeMode="contain" />
              </PressableScale>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

function HeaderTab({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const color = active ? "#F5821F" : "#8A8A8A";
  return (
    <Pressable onPress={onPress} className="items-center gap-1" accessibilityRole="button" accessibilityLabel={label}>
      <MaterialIcons name={icon} size={26} color={color} />
      <Text className="text-body-sm font-bold" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Key({ children, onPress, bg }: { children: React.ReactNode; onPress: () => void; bg?: string }) {
  return (
    <Pressable
      onPress={onPress}
      className="items-center justify-center"
      style={{ width: 78, height: 78, borderRadius: 39, backgroundColor: bg ?? "#242424" }}
      accessibilityRole="button"
    >
      {children}
    </Pressable>
  );
}
