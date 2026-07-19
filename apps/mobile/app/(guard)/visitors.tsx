import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from "react-native";
import type { ImageSourcePropType, KeyboardTypeOptions } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import type { FlatSearchResult } from "@repo/services/resident/model";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { captureVisitorPhoto } from "../../lib/capture-visitor-photo";
import { VISITOR_TYPES, type VisitorType } from "../../lib/visitor-types";
import { FlatSearchField } from "../../components/flat-search-field";
import { shadowElevated } from "../../lib/shadows";

type TypeContent = { title: string; noun: string; img: ImageSourcePropType };

const TYPE_CONTENT: Record<VisitorType, TypeContent> = {
  guest: { title: "New Guest", noun: "Guest", img: require("../../assets/characters/guest.png") },
  delivery: { title: "New Delivery", noun: "Delivery", img: require("../../assets/characters/delivery.png") },
  service: { title: "New Service", noun: "Serviceman", img: require("../../assets/characters/service.png") },
  cab: { title: "New Cab", noun: "Cab", img: require("../../assets/characters/cab.png") },
  other: { title: "New Visitor", noun: "Visitor", img: require("../../assets/characters/guest.png") },
};

const DELIVERY_COMPANIES = ["Amazon", "Flipkart", "Zomato", "Swiggy", "Blinkit", "Other"];
const CAB_COMPANIES = ["Uber", "Ola", "Rapido", "Local Taxi"];

/** Underline text field matching the pre-approve mockups (no box, just a bottom rule). */
function UnderlineInput({
  placeholder,
  value,
  onChangeText,
  keyboardType,
  maxLength,
  rightIcon,
  error,
}: {
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  rightIcon?: React.ReactNode;
  error?: boolean;
}) {
  return (
    <View className="flex-row items-center" style={{ borderBottomWidth: 1, borderBottomColor: error ? "#BA1A1A" : "#333333" }}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#7E7E7E"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        maxLength={maxLength}
        className="flex-1 py-4 text-body-lg text-on-surface"
        accessibilityLabel={placeholder}
      />
      {rightIcon}
    </View>
  );
}

/** Inline dropdown — full-width (placeholder left) or labeled-row (label left, value right). */
function Dropdown({
  placeholder,
  value,
  options,
  onSelect,
  inlineLabel,
  error,
}: {
  placeholder?: string;
  value: string | null;
  options: string[];
  onSelect: (v: string) => void;
  inlineLabel?: string;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: error ? "#BA1A1A" : "#333333" }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center justify-between py-4"
        accessibilityRole="button"
        accessibilityLabel={inlineLabel ? `${inlineLabel}: ${value ?? ""}` : (value ?? placeholder)}
      >
        {inlineLabel ? (
          <>
            <Text className="text-body-lg text-text-muted">{inlineLabel}</Text>
            <View className="flex-row items-center gap-1">
              <Text className="text-body-lg font-bold text-on-surface">{value ?? placeholder}</Text>
              <MaterialIcons name={open ? "arrow-drop-up" : "arrow-drop-down"} size={24} color="#F5F5F5" />
            </View>
          </>
        ) : (
          <>
            <Text className="text-body-lg" style={{ color: value ? "#F5F5F5" : "#7E7E7E" }}>
              {value ?? placeholder}
            </Text>
            <MaterialIcons name={open ? "arrow-drop-up" : "arrow-drop-down"} size={24} color="#F5F5F5" />
          </>
        )}
      </Pressable>
      {open && (
        <View className="mb-3 overflow-hidden rounded-xl" style={{ backgroundColor: "#242424" }}>
          {options.map((opt) => {
            const active = opt === value;
            return (
              <Pressable
                key={opt}
                onPress={() => {
                  onSelect(opt);
                  setOpen(false);
                }}
                className="flex-row items-center justify-between px-4 py-3"
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text className="text-body-md" style={{ color: active ? "#F5821F" : "#C4C4C4", fontWeight: active ? "700" : "500" }}>
                  {opt}
                </Text>
                {active && <MaterialIcons name="check" size={18} color="#F5821F" />}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function GuardRegisterVisitor() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { type: typeParam } = useLocalSearchParams<{ type?: string }>();
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();

  const initialType: VisitorType = VISITOR_TYPES.some((t) => t.value === typeParam)
    ? (typeParam as VisitorType)
    : "guest";

  const [selectedType, setSelectedType] = useState<VisitorType>(initialType);
  const [selectedFlat, setSelectedFlat] = useState<FlatSearchResult | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryCompany, setDeliveryCompany] = useState<string | null>(null);
  const [deliveryOther, setDeliveryOther] = useState("");
  const [cabCompany, setCabCompany] = useState<string>("Uber");
  const [cabLast4, setCabLast4] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const content = TYPE_CONTENT[selectedType] ?? TYPE_CONTENT.guest;
  const nounLower = content.noun.toLowerCase();

  // Screen stays mounted (href: null tab), so sync a later ?type= from a gate card tap.
  useEffect(() => {
    if (VISITOR_TYPES.some((t) => t.value === typeParam)) {
      setSelectedType(typeParam as VisitorType);
      setError(null);
    }
  }, [typeParam]);

  const createMutation = trpc.visitors.create.useMutation({
    onSuccess: (visitor) => {
      hapticSuccess();
      showToast(`Request sent to flat ${visitor.flatNumber ?? ""} for approval`, "success");
      utils.visitors.listForGuard.invalidate();
      router.replace("/(guard)/history");
    },
    onError: (err) => {
      hapticError();
      showToast(getErrorMessage(err), "error");
    },
  });

  async function handleCapturePhoto() {
    setIsCapturing(true);
    try {
      const dataUrl = await captureVisitorPhoto();
      if (dataUrl) setPhoto(dataUrl);
    } catch {
      showToast("Couldn't capture photo — camera unavailable.", "error");
    } finally {
      setIsCapturing(false);
    }
  }

  function submit() {
    setError(null);
    if (!selectedFlat) {
      setError("Select the flat this visitor is here for.");
      hapticError();
      return;
    }

    let payloadName = "";
    let payloadPhone: string | undefined;

    if (selectedType === "delivery") {
      const company = deliveryCompany === "Other" ? deliveryOther.trim() : deliveryCompany;
      if (!company) {
        setError("Please choose a delivery company.");
        hapticError();
        return;
      }
      payloadName = company;
    } else if (selectedType === "cab") {
      if (!/^\d{4}$/.test(cabLast4.trim())) {
        setError("Enter the last 4 digits of the cab number.");
        hapticError();
        return;
      }
      payloadName = `${cabCompany} · ${cabLast4.trim()}`;
    } else {
      if (!name.trim()) {
        setError(`Please enter the ${nounLower} name.`);
        hapticError();
        return;
      }
      payloadName = name.trim();
      payloadPhone = phone.trim() || undefined;
    }

    createMutation.mutate({
      flatId: selectedFlat.flatId,
      name: payloadName,
      phone: payloadPhone,
      type: selectedType,
      photoBase64: photo ?? undefined,
    });
  }

  return (
    <View className="flex-1" style={{ backgroundColor: "#0D0D0D" }}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        className="absolute z-10"
        style={{ top: insets.top + 8, left: 20 }}
        accessibilityLabel="Close"
        accessibilityRole="button"
      >
        <MaterialIcons name="close" size={28} color="#FFFFFF" />
      </Pressable>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-5"
          contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Type switcher — guards can change the visitor type on the fly */}
          <View className="flex-row flex-wrap gap-2 pb-3.5">
            {VISITOR_TYPES.map((t) => {
              const active = t.value === selectedType;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => {
                    setSelectedType(t.value);
                    setError(null);
                  }}
                  className="flex-row items-center gap-1.5 self-start rounded-full px-4 py-2"
                  style={{ backgroundColor: active ? "#F5821F" : "#1A1A1A", borderWidth: 1, borderColor: active ? "#F5821F" : "#333333" }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <MaterialIcons name={t.icon} size={16} color={active ? "#141118" : "#C4C4C4"} />
                  <Text className="text-body-sm font-bold" style={{ color: active ? "#141118" : "#C4C4C4" }}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="overflow-hidden rounded-3xl bg-surface" style={shadowElevated}>
            {/* Tinted header: title + 3D avatar */}
            <View className="flex-row items-center justify-between px-6 pb-2 pt-6" style={{ backgroundColor: "#242424" }}>
              <Text className="flex-1 text-headline-lg font-extrabold text-on-surface">{content.title}</Text>
              <Image source={content.img} style={{ width: 84, height: 84 }} resizeMode="contain" />
            </View>

            <View className="gap-1 px-6 pb-6 pt-2">
              {/* Flat — guard-specific, required */}
              <View className="pb-2">
                <FlatSearchField
                  selected={selectedFlat}
                  error={!selectedFlat && error ? error : undefined}
                  onSelect={(flat) => {
                    setSelectedFlat(flat);
                    setError(null);
                  }}
                  onClear={() => setSelectedFlat(null)}
                />
              </View>

              {/* DELIVERY: company dropdown */}
              {selectedType === "delivery" && (
                <>
                  <Dropdown
                    placeholder="Select Delivery company"
                    value={deliveryCompany}
                    options={DELIVERY_COMPANIES}
                    onSelect={(v) => {
                      setDeliveryCompany(v);
                      setError(null);
                    }}
                    error={!!error && !deliveryCompany}
                  />
                  {deliveryCompany === "Other" && (
                    <UnderlineInput
                      placeholder="Courier / company name"
                      value={deliveryOther}
                      onChangeText={(v) => {
                        setDeliveryOther(v);
                        setError(null);
                      }}
                    />
                  )}
                </>
              )}

              {/* CAB: last 4 digits + company */}
              {selectedType === "cab" && (
                <>
                  <UnderlineInput
                    placeholder="Last 4 Digit of Cab num"
                    value={cabLast4}
                    onChangeText={(v) => {
                      setCabLast4(v.replace(/[^0-9]/g, ""));
                      setError(null);
                    }}
                    keyboardType="number-pad"
                    maxLength={4}
                    error={!!error && !/^\d{4}$/.test(cabLast4.trim())}
                  />
                  <Dropdown inlineLabel="Company" value={cabCompany} options={CAB_COMPANIES} onSelect={setCabCompany} />
                </>
              )}

              {/* GUEST / SERVICE / OTHER: name + phone */}
              {(selectedType === "guest" || selectedType === "service" || selectedType === "other") && (
                <>
                  <UnderlineInput
                    placeholder={selectedType === "service" ? "Serviceman / Company Name" : `Enter ${content.noun} Name`}
                    value={name}
                    onChangeText={(v) => {
                      setName(v);
                      setError(null);
                    }}
                    rightIcon={<MaterialIcons name="badge" size={22} color="#C4C4C4" />}
                    error={!!error && !name.trim()}
                  />
                  <UnderlineInput placeholder="Phone Number (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                </>
              )}

              {/* Optional visitor photo — a security record */}
              <View className="flex-row items-center gap-3 py-4">
                {photo ? (
                  <>
                    <Image source={{ uri: photo }} style={{ width: 52, height: 52, borderRadius: 26 }} />
                    <Text className="flex-1 text-body-md text-on-surface">Photo captured</Text>
                    <Pressable onPress={() => setPhoto(null)} hitSlop={8} accessibilityLabel="Remove photo" accessibilityRole="button">
                      <MaterialIcons name="delete-outline" size={22} color="#FF5F5F" />
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    onPress={handleCapturePhoto}
                    disabled={isCapturing}
                    className="flex-row items-center gap-2"
                    accessibilityLabel="Take a photo of the visitor"
                    accessibilityRole="button"
                  >
                    {isCapturing ? (
                      <ActivityIndicator size="small" color="#F5821F" />
                    ) : (
                      <MaterialIcons name="photo-camera" size={22} color="#F5821F" />
                    )}
                    <Text className="text-body-md font-bold text-primary">
                      {isCapturing ? "Opening camera…" : "Take visitor photo (optional)"}
                    </Text>
                  </Pressable>
                )}
              </View>

              {error && (
                <Text className="pt-1 text-body-sm" style={{ color: "#BA1A1A" }}>
                  {error}
                </Text>
              )}

              {/* Submit — creates a pending request the resident approves */}
              <Pressable
                onPress={submit}
                disabled={createMutation.isPending}
                className="mt-3 h-14 flex-row items-center justify-center gap-2 rounded-2xl"
                style={{ backgroundColor: "#F5821F", opacity: createMutation.isPending ? 0.7 : 1 }}
                accessibilityLabel="Send request to resident"
                accessibilityRole="button"
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#141118" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={20} color="#141118" />
                    <Text className="text-body-lg font-bold" style={{ color: "#141118" }}>
                      Send for Approval
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          <Pressable onPress={() => router.push("/(guard)/history")} className="items-center pt-6">
            <Text className="text-body-md font-bold" style={{ color: "#C99A5A" }}>
              View In-Out
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
