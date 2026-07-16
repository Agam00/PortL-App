import { useState } from "react";
import { View, Text, Image, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Chip } from "../../components/ui/chip";
import { FlatSearchField } from "../../components/flat-search-field";
import { PressableScale } from "../../components/ui/pressable-scale";
import { shadowCard } from "../../lib/shadows";

type FormValues = z.infer<typeof createVisitorInputSchema>;

const QUICK_BRANDS = ["Amazon Delivery", "Zomato", "Swiggy Delivery", "Flipkart"];

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
      <ScreenHeader title="Register Visitor" role="guard" />
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8" keyboardShouldPersistTaps="handled">
        <Text className="text-body-sm text-text-muted">Log a new entry into the community.</Text>

        <View className="gap-4 rounded-card bg-surface p-5" style={shadowCard}>
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

        <View className="gap-2">
          <Text className="text-label-caps uppercase tracking-wide text-text-muted">Visitor Type</Text>
          <View className="flex-row flex-wrap gap-2">
            {VISITOR_TYPES.map((t) => (
              <Chip
                key={t.value}
                label={t.label}
                icon={t.icon}
                selected={selectedType === t.value}
                onPress={() => setValue("type", t.value)}
              />
            ))}
          </View>
        </View>

        {selectedType === "delivery" && (
          <View className="gap-2 rounded-card bg-surface-container p-4">
            <Text className="text-label-caps uppercase tracking-wide text-text-muted">Quick Select Provider</Text>
            <View className="flex-row flex-wrap gap-2">
              {QUICK_BRANDS.map((brand) => (
                <Chip key={brand} label={brand} onPress={() => setValue("name", brand)} />
              ))}
            </View>
          </View>
        )}

        <View className="gap-4 rounded-card bg-surface p-5" style={shadowCard}>
          <Text className="text-headline-md font-extrabold text-on-surface">Details</Text>
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

        <View className="items-center gap-3 rounded-card bg-surface p-6" style={shadowCard}>
          {photo ? (
            <>
              <Image source={{ uri: photo }} className="h-24 w-24 rounded-full" />
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
                className="h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-primary-container bg-surface-container"
              >
                {isCapturing ? (
                  <ActivityIndicator color="#6244CD" />
                ) : (
                  <MaterialIcons name="photo-camera" size={26} color="#6244CD" />
                )}
              </PressableScale>
              <Text className="text-body-sm font-bold text-on-surface">Take Photo</Text>
              <Text className="text-body-sm text-text-muted">Optional visual record for security.</Text>
            </>
          )}
        </View>

        <Button
          className="mt-2"
          onPress={handleSubmit((values) => createMutation.mutate(values))}
          loading={createMutation.isPending}
        >
          Allow Entry
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
