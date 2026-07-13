import { useState } from "react";
import { View, Text, Image, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createVisitorInputSchema } from "@repo/services/visitor/model";
import type { FlatSearchResult } from "@repo/services/resident/model";
import type { z } from "zod";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { captureVisitorPhoto } from "../../lib/capture-visitor-photo";
import { VISITOR_TYPES } from "../../lib/visitor-types";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Chip } from "../../components/ui/chip";
import { FlatSearchField } from "../../components/flat-search-field";

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
      showToast(`Request sent for flat ${visitor.flatNumber ?? ""}`, "success");
      reset({ flatId: "", name: "", phone: "", type: "delivery", photoBase64: undefined });
      setSelectedFlat(null);
      setPhoto(null);
      utils.visitors.listForGuard.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
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
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <ScreenHeader title="Register Visitor" role="guard" />
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8" keyboardShouldPersistTaps="handled">
        <View className="gap-4 rounded-lg border border-border-subtle bg-surface p-4">
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

          <View className="gap-2">
            <Text className="text-label-caps uppercase text-text-muted">Visitor Type</Text>
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
            <View className="gap-2">
              <Text className="text-label-caps uppercase text-text-muted">Quick Select</Text>
              <View className="flex-row flex-wrap gap-2">
                {QUICK_BRANDS.map((brand) => (
                  <Chip key={brand} label={brand} onPress={() => setValue("name", brand)} />
                ))}
              </View>
            </View>
          )}

          <View className="h-px bg-border-subtle" />

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Full Name"
                placeholder="Enter visitor name"
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
                label="Phone Number"
                keyboardType="phone-pad"
                placeholder="10-digit number"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.phone?.message}
              />
            )}
          />

          <View className="gap-2">
            <Text className="text-label-caps uppercase text-text-muted">Photo (Optional)</Text>
            {photo ? (
              <View className="flex-row items-center gap-3">
                <Image source={{ uri: photo }} className="h-16 w-16 rounded-lg border border-border-subtle" />
                <Button variant="outline" onPress={() => setPhoto(null)}>
                  Remove
                </Button>
              </View>
            ) : (
              <Button variant="outline" loading={isCapturing} onPress={handleCapturePhoto}>
                Take Photo
              </Button>
            )}
          </View>

          <Button
            className="mt-2"
            onPress={handleSubmit((values) => createMutation.mutate(values))}
            loading={createMutation.isPending}
          >
            Send Request
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
