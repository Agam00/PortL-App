import { Text, View } from "react-native";

export default function Home() {
  return (
    <View className="flex-1 items-center justify-center gap-6 bg-white px-6">
      <Text className="text-3xl font-bold text-slate-900">Portl</Text>
      <Text className="text-center text-base text-slate-500">
        Society gate, community & operations — one app.
      </Text>

      <View className="w-full gap-3">
        <View className="rounded-xl bg-resident-light px-4 py-3">
          <Text className="font-semibold text-resident">Resident</Text>
        </View>
        <View className="rounded-xl bg-guard-light px-4 py-3">
          <Text className="font-semibold text-guard">Security Guard</Text>
        </View>
        <View className="rounded-xl bg-admin-light px-4 py-3">
          <Text className="font-semibold text-admin">Society Admin</Text>
        </View>
      </View>
    </View>
  );
}
