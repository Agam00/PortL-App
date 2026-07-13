import { useState } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MaterialIcons } from "@expo/vector-icons";
import { createVisitorInputSchema, type visitorTypeSchema } from "@repo/services/visitor/model";
import type { z } from "zod";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Chip } from "../../components/ui/chip";

type VisitorType = z.infer<typeof visitorTypeSchema>;
type FormValues = z.infer<typeof createVisitorInputSchema>;

const TYPES: { value: VisitorType; label: string; icon: React.ComponentProps<typeof MaterialIcons>["name"] }[] = [
  { value: "delivery", label: "Delivery", icon: "local-shipping" },
  { value: "guest", label: "Guest", icon: "person" },
  { value: "cab", label: "Cab", icon: "local-taxi" },
  { value: "service", label: "Service", icon: "build" },
  { value: "other", label: "Other", icon: "more-horiz" },
];

const QUICK_BRANDS = ["Amazon Delivery", "Zomato", "Swiggy Delivery", "Flipkart"];

export default function GuardRegisterVisitor() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createVisitorInputSchema),
    defaultValues: { flatNumber: "", name: "", phone: "", type: "delivery" },
  });

  const selectedType = watch("type");

  const createMutation = trpc.visitors.create.useMutation({
    onSuccess: (visitor) => {
      showToast(`Request sent for flat ${visitor.flatNumber ?? visitor.flatId}`, "success");
      reset({ flatNumber: "", name: "", phone: "", type: "delivery" });
      utils.visitors.listForGuard.invalidate();
    },
    onError: (error) => showToast(getErrorMessage(error), "error"),
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <ScreenHeader title="Register Visitor" role="guard" />
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8" keyboardShouldPersistTaps="handled">
        <View className="gap-4 rounded-lg border border-border-subtle bg-surface p-4">
          <View className="gap-2">
            <Text className="text-label-caps uppercase text-text-muted">Visitor Type</Text>
            <View className="flex-row flex-wrap gap-2">
              {TYPES.map((t) => (
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

          <View className="flex-row gap-3">
            <View className="flex-1">
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
            </View>
            <View className="flex-1">
              <Controller
                control={control}
                name="flatNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Flat No."
                    autoCapitalize="characters"
                    placeholder="e.g. A-101"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.flatNumber?.message}
                  />
                )}
              />
            </View>
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
