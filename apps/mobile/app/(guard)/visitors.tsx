import { useState, useEffect } from "react";
import { View, Text, Image, ScrollView, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { createVisitorInputSchema } from "@repo/services/visitor/model";
import type { FlatSearchResult } from "@repo/services/resident/model";
import type { z } from "zod";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { captureVisitorPhoto } from "../../lib/capture-visitor-photo";
import { VISITOR_TYPES } from "../../lib/visitor-types";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { FlatSearchField } from "../../components/flat-search-field";
import { PressableScale } from "../../components/ui/pressable-scale";
import { shadowCard } from "../../lib/shadows";

type FormValues = z.infer<typeof createVisitorInputSchema>;

// register_visitor mockup: short provider names on white pill chips.
const QUICK_BRANDS = ["Amazon", "Zomato", "Swiggy", "Flipkart"];

export default function GuardRegisterVisitor() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [selectedFlat, setSelectedFlat] = useState<FlatSearchResult | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createVisitorInputSchema),
    defaultValues: { flatId: "", name: "", phone: "", type: "delivery" },
  });

  const selectedType = watch("type");

  // Preset the visitor type when opened from a gate "Add New Visitor" card (?type=guest).
  const { type: typeParam } = useLocalSearchParams<{ type?: string }>();
  useEffect(() => {
    if (VISITOR_TYPES.some((t) => t.value === typeParam)) {
      setValue("type", typeParam as FormValues["type"]);
    }
  }, [typeParam, setValue]);

  const createMutation = trpc.visitors.create.useMutation({
    onSuccess: (visitor) => {
      hapticSuccess();
      showToast(`Request sent for flat ${visitor.flatNumber ?? ""}`, "success");
      reset({ flatId: "", name: "", phone: "", type: "delivery", photoBase64: undefined });
      setSelectedFlat(null);
      setPhoto(null);
      utils.visitors.listForGuard.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  async function handleCapturePhoto() {
    setIsCapturing(true);
    try {
      const dataUrl = await captureVisitorPhoto();
      if (dataUrl) {
        setPhoto(dataUrl);
        setValue("photoBase64", dataUrl);
      }
    } catch {
      showToast("Couldn't capture photo — camera unavailable.", "error");
    } finally {
      setIsCapturing(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <ScreenHeader title="Register Visitor" subtitle="Log a new entry into the community." role="guard" />
      <ScrollView contentContainerClassName="gap-5 px-4 pb-8 pt-2" keyboardShouldPersistTaps="handled">
        <View className="gap-4 rounded-xl bg-surface p-5" style={shadowCard}>
          <Controller
            control={control}
            name="flatId"
            render={({ field: { onChange } }) => (
              <FlatSearchField
                selected={selectedFlat}
                error={errors.flatId?.message}
                onSelect={(flat) => {
                  setSelectedFlat(flat);
                  onChange(flat.flatId);
                }}
                onClear={() => {
                  setSelectedFlat(null);
                  onChange("");
                }}
              />
            )}
          />
        </View>

        {/* Mockup: 2-column grid of square type cards, icon above label. */}
        <View className="gap-3">
          <Text className="text-body-md font-bold text-on-surface">Visitor Type</Text>
          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            {VISITOR_TYPES.map((t) => {
              const isSelected = selectedType === t.value;
              return (
                <PressableScale
                  key={t.value}
                  scaleTo={0.96}
                  onPress={() => setValue("type", t.value)}
                  className="items-center justify-center gap-2 bg-surface p-5"
                  style={[
                    {
                      borderRadius: 12,
                      width: "47%",
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? "#F5821F" : "transparent",
                      backgroundColor: isSelected ? "#242424" : "#1A1A1A",
                    },
                    shadowCard,
                  ]}
                  accessibilityLabel={`Visitor type: ${t.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <MaterialIcons name={t.icon} size={26} color={isSelected ? "#F5821F" : "#F5F5F5"} />
                  <Text className={`text-body-sm font-bold ${isSelected ? "text-primary" : "text-on-surface"}`}>
                    {t.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>

        {selectedType === "delivery" && (
          <View className="gap-3 p-4" style={{ borderRadius: 16, backgroundColor: "#242424" }}>
            <Text className="text-body-sm font-bold text-on-surface">Quick Select Provider</Text>
            <View className="flex-row flex-wrap gap-2">
              {QUICK_BRANDS.map((brand) => (
                <Pressable
                  key={brand}
                  onPress={() => setValue("name", brand)}
                  className="rounded-full bg-surface px-5 py-2.5"
                  style={shadowCard}
                  accessibilityLabel={`Set name to ${brand}`}
                  accessibilityRole="button"
                >
                  <Text className="text-body-sm font-bold text-on-surface">{brand}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View className="gap-4 rounded-xl bg-surface p-5" style={shadowCard}>
          <View className="border-b border-outline-variant pb-3">
            <Text className="text-body-lg font-bold text-on-surface">Details</Text>
          </View>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Name"
                placeholder="Visitor Name"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.name?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Phone Number (Optional)"
                keyboardType="phone-pad"
                placeholder="+91"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.phone?.message}
              />
            )}
          />
        </View>

        <View className="items-center gap-3 rounded-xl bg-surface p-6" style={shadowCard}>
          {photo ? (
            <>
              <Image source={{ uri: photo }} style={{ width: 120, height: 120, borderRadius: 60 }} />
              <Button variant="outline" onPress={() => setPhoto(null)}>
                Remove Photo
              </Button>
            </>
          ) : (
            <>
              <PressableScale
                onPress={handleCapturePhoto}
                disabled={isCapturing}
                scaleTo={0.95}
                className="items-center justify-center gap-1"
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  borderWidth: 2,
                  borderStyle: "dashed",
                  borderColor: "#FF9A3D",
                  backgroundColor: "#242424",
                }}
                accessibilityLabel="Take a photo of the visitor"
                accessibilityRole="button"
              >
                {isCapturing ? (
                  <ActivityIndicator color="#F5821F" />
                ) : (
                  <>
                    <MaterialIcons name="photo-camera" size={26} color="#F5821F" />
                    <Text className="text-body-sm font-bold text-primary">Take Photo</Text>
                  </>
                )}
              </PressableScale>
              <Text className="text-body-sm text-text-muted">Optional visual record for security.</Text>
            </>
          )}
        </View>

        <Pressable
          onPress={handleSubmit((values) => createMutation.mutate(values))}
          disabled={createMutation.isPending}
          className="mt-1 h-14 flex-row items-center justify-center gap-2 rounded-full"
          style={{ backgroundColor: "#FF9A3D" }}
          accessibilityLabel="Allow entry"
          accessibilityRole="button"
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="check-circle-outline" size={22} color="#fff" />
              <Text className="text-body-lg font-bold" style={{ color: "#FFFFFF" }}>
                Allow Entry
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
