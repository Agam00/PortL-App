import { useState } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { z } from "zod";
import { preApproveVisitorInputSchema } from "@repo/services/visitor/model";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { VISITOR_TYPES } from "../../lib/visitor-types";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Chip } from "../../components/ui/chip";
import { TimeField } from "../../components/ui/time-field";

const formSchema = preApproveVisitorInputSchema.omit({ validFrom: true, validUntil: true });
type FormValues = z.infer<typeof formSchema>;

function twoHoursFromNow() {
  return new Date(Date.now() + 2 * 60 * 60 * 1000);
}

export default function PreApproveGuest() {
  const router = useRouter();
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [startTime, setStartTime] = useState(() => new Date());
  const [endTime, setEndTime] = useState(twoHoursFromNow);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", phone: "", type: "guest" },
  });

  const selectedType = watch("type");

  const preApproveMutation = trpc.visitors.preApprove.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Guest pre-approved", "success");
      utils.visitors.listPreApprovedForResident.invalidate();
      router.back();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  function onSubmit(values: FormValues) {
    if (endTime <= startTime) {
      hapticError();
      showToast("End time must be after start time.", "error");
      return;
    }
    preApproveMutation.mutate({
      ...values,
      validFrom: startTime.toISOString(),
      validUntil: endTime.toISOString(),
    });
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <ScreenHeader title="Pre-approve Guest" role="resident" />
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-body-sm text-text-muted">
            Pre-approve an expected guest or cab — the guard can let them in without calling you.
          </Text>
          <Pressable onPress={() => router.push("/(resident)/pre-approvals")} className="ml-2 px-1 py-1">
            <Text className="text-body-sm font-medium text-primary">My Pre-approvals</Text>
          </Pressable>
        </View>

        <View className="gap-4 rounded-lg border border-border-subtle bg-surface-elevated p-4">
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Full Name"
                placeholder="e.g. Jane Doe"
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
                placeholder="10-digit number"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.phone?.message}
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

          <View className="h-px bg-border-subtle" />

          <View className="gap-2">
            <Text className="text-label-caps uppercase text-text-muted">Access Window</Text>
            <View className="flex-row gap-3">
              <TimeField label="Valid From" value={startTime} onChange={setStartTime} />
              <TimeField label="Valid Until" value={endTime} onChange={setEndTime} />
            </View>
          </View>

          <Button className="mt-2" onPress={handleSubmit(onSubmit)} loading={preApproveMutation.isPending}>
            Generate Pre-approval
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
