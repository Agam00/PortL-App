import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
} from "react-native";
import type { ImageSourcePropType, KeyboardTypeOptions } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { VISITOR_TYPES, type VisitorType } from "../../lib/visitor-types";
import { shadowElevated } from "../../lib/shadows";

type TypeContent = { title: string; noun: string; img: ImageSourcePropType };

const TYPE_CONTENT: Record<VisitorType, TypeContent> = {
  guest: { title: "Allow my Guest", noun: "Guest", img: require("../../assets/characters/guest.png") },
  delivery: { title: "Allow Deliveryman", noun: "Deliveryman", img: require("../../assets/characters/delivery.png") },
  service: { title: "Allow Serviceman", noun: "Serviceman", img: require("../../assets/characters/service.png") },
  cab: { title: "Allow my Cab", noun: "Cab", img: require("../../assets/characters/cab.png") },
  other: { title: "Allow my Visitor", noun: "Visitor", img: require("../../assets/characters/guest.png") },
};

const CHECKBOX_LABEL: Partial<Record<VisitorType, string>> = {
  guest: "Send gatepass to guest",
  delivery: "Keep package at gate.",
  service: "Send Entry pass to Service Man",
};

const DELIVERY_COMPANIES = ["Amazon", "Flipkart", "Zomato", "Swiggy", "Blinkit", "Other"];
const CAB_COMPANIES = ["Uber", "Ola", "Rapido", "Local Taxi"];
const WINDOW_OPTIONS = ["Today", "Tomorrow", "This Week"];

function windowRange(label: string): { validFrom: Date; validUntil: Date } {
  const now = new Date();
  if (label === "Tomorrow") {
    const start = new Date(now);
    start.setDate(now.getDate() + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { validFrom: start, validUntil: end };
  }
  if (label === "This Week") {
    return { validFrom: now, validUntil: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) };
  }
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const validUntil = end > now ? end : new Date(now.getTime() + 2 * 60 * 60 * 1000);
  return { validFrom: now, validUntil };
}

/** Underline text field matching the mockups (no box, just a bottom rule). */
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
    <View
      className="flex-row items-center"
      style={{ borderBottomWidth: 1, borderBottomColor: error ? "#BA1A1A" : "#E3DEEA" }}
    >
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#9A96A3"
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
    <View style={{ borderBottomWidth: 1, borderBottomColor: error ? "#BA1A1A" : "#E3DEEA" }}>
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
              <MaterialIcons name={open ? "arrow-drop-up" : "arrow-drop-down"} size={24} color="#1C1A23" />
            </View>
          </>
        ) : (
          <>
            <Text className="text-body-lg" style={{ color: value ? "#1C1A23" : "#9A96A3" }}>
              {value ?? placeholder}
            </Text>
            <MaterialIcons name={open ? "arrow-drop-up" : "arrow-drop-down"} size={24} color="#1C1A23" />
          </>
        )}
      </Pressable>
      {open && (
        <View className="mb-3 overflow-hidden rounded-xl" style={{ backgroundColor: "#F4F1FA" }}>
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
                <Text
                  className="text-body-md"
                  style={{ color: active ? "#6244CD" : "#48454F", fontWeight: active ? "700" : "500" }}
                >
                  {opt}
                </Text>
                {active && <MaterialIcons name="check" size={18} color="#6244CD" />}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function Checkbox({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      className="flex-row items-center gap-3 py-4"
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <View
        className="items-center justify-center rounded"
        style={{
          width: 22,
          height: 22,
          borderWidth: 2,
          borderColor: checked ? "#6244CD" : "#B9B4C4",
          backgroundColor: checked ? "#6244CD" : "transparent",
        }}
      >
        {checked && <MaterialIcons name="check" size={16} color="#FFFFFF" />}
      </View>
      <Text className="text-body-md text-text-muted">{label}</Text>
    </Pressable>
  );
}

export default function PreApproveGuest() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { type: typeParam } = useLocalSearchParams<{ type?: string }>();
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();

  const initialType: VisitorType = VISITOR_TYPES.some((t) => t.value === typeParam)
    ? (typeParam as VisitorType)
    : "guest";

  const [selectedType, setSelectedType] = useState<VisitorType>(initialType);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryCompany, setDeliveryCompany] = useState<string | null>(null);
  const [deliveryOther, setDeliveryOther] = useState("");
  const [cabCompany, setCabCompany] = useState<string>("Uber");
  const [cabLast4, setCabLast4] = useState("");
  const [windowLabel, setWindowLabel] = useState("Today");
  const [checkbox, setCheckbox] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const content = TYPE_CONTENT[selectedType] ?? TYPE_CONTENT.guest;
  const nounLower = content.noun.toLowerCase();

  // Screen stays mounted (href: null tab), so sync a later ?type= from a home card tap.
  useEffect(() => {
    if (VISITOR_TYPES.some((t) => t.value === typeParam)) {
      setSelectedType(typeParam as VisitorType);
      setError(null);
    }
  }, [typeParam]);

  const preApproveMutation = trpc.visitors.preApprove.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast(`${content.noun} pre-approved`, "success");
      utils.visitors.listPreApprovedForResident.invalidate();
      router.replace("/(resident)/pre-approvals");
    },
    onError: (err) => {
      hapticError();
      showToast(getErrorMessage(err), "error");
    },
  });

  function submit() {
    setError(null);
    const { validFrom, validUntil } = windowRange(selectedType === "cab" ? "Today" : windowLabel);
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

    preApproveMutation.mutate({
      name: payloadName,
      phone: payloadPhone,
      type: selectedType,
      validFrom: validFrom.toISOString(),
      validUntil: validUntil.toISOString(),
    });
  }

  const checkboxLabel = CHECKBOX_LABEL[selectedType];

  return (
    <View className="flex-1" style={{ backgroundColor: "#15131A" }}>
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
          <View className="overflow-hidden rounded-3xl bg-white" style={shadowElevated}>
            {/* Tinted header: title + 3D avatar */}
            <View className="flex-row items-center justify-between px-6 pt-6 pb-2" style={{ backgroundColor: "#EAF0FB" }}>
              <Text className="flex-1 text-headline-lg font-extrabold text-on-surface">{content.title}</Text>
              <Image source={content.img} style={{ width: 84, height: 84 }} resizeMode="contain" />
            </View>

            <View className="gap-1 px-6 pb-6 pt-2">
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
                    error={!!error}
                  />
                  <Dropdown inlineLabel="Company" value={cabCompany} options={CAB_COMPANIES} onSelect={setCabCompany} />
                </>
              )}

              {/* GUEST / SERVICE / OTHER: name + phone */}
              {(selectedType === "guest" || selectedType === "service" || selectedType === "other") && (
                <>
                  <UnderlineInput
                    placeholder={selectedType === "service" ? "Serviceman/Company Name" : `Enter ${content.noun} Name`}
                    value={name}
                    onChangeText={(v) => {
                      setName(v);
                      setError(null);
                    }}
                    rightIcon={<MaterialIcons name="contacts" size={22} color="#48454F" />}
                    error={!!error && !name.trim()}
                  />
                  <UnderlineInput
                    placeholder="Phone Number"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </>
              )}

              {/* "To enter" window — every type except cab */}
              {selectedType !== "cab" && (
                <Dropdown
                  inlineLabel={selectedType === "guest" ? "To Enter" : "To enter in next"}
                  value={windowLabel}
                  options={WINDOW_OPTIONS}
                  onSelect={setWindowLabel}
                />
              )}

              {/* Per-type checkbox */}
              {checkboxLabel && (
                <Checkbox label={checkboxLabel} checked={checkbox} onToggle={() => setCheckbox((v) => !v)} />
              )}

              {error && (
                <Text className="pt-1 text-body-sm" style={{ color: "#BA1A1A" }}>
                  {error}
                </Text>
              )}

              {/* Submit */}
              <Pressable
                onPress={submit}
                disabled={preApproveMutation.isPending}
                className="mt-3 h-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: "#141118", opacity: preApproveMutation.isPending ? 0.7 : 1 }}
                accessibilityLabel="Submit pre-approval"
                accessibilityRole="button"
              >
                <Text className="text-body-lg font-bold text-white">
                  {preApproveMutation.isPending ? "Submitting..." : "Submit"}
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable onPress={() => router.push("/(resident)/pre-approvals")} className="items-center pt-6">
            <Text className="text-body-md font-bold" style={{ color: "#C9BEF0" }}>
              View my pre-approvals
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
