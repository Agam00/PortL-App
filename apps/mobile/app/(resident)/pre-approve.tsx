import { useState, useEffect } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { z } from "zod";
import { preApproveVisitorInputSchema } from "@repo/services/visitor/model";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { VISITOR_TYPES } from "../../lib/visitor-types";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Input } from "../../components/ui/input";
import { Chip } from "../../components/ui/chip";
import { shadowCard } from "../../lib/shadows";

const formSchema = preApproveVisitorInputSchema.omit({ validFrom: true, validUntil: true });
type FormValues = z.infer<typeof formSchema>;

function twoHoursFromNow() {
  return new Date(Date.now() + 2 * 60 * 60 * 1000);
}

function formatDateTime(date: Date) {
  return `${date.toLocaleDateString([], { month: "2-digit", day: "2-digit", year: "numeric" })}, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

/** Boxed date+time field per the pre_approve_guest mockup — tap opens date, then time. */
function DateTimeField({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  value: Date;
  onChange: (date: Date) => void;
}) {
  const [step, setStep] = useState<"none" | "date" | "time">("none");

  return (
    <View className="gap-2">
      <Text className="text-body-md font-bold text-on-surface">{label}</Text>
      <Pressable
        onPress={() => setStep("date")}
        className="flex-row items-center gap-3 rounded-xl border border-outline-variant bg-surface px-4 py-3.5"
        accessibilityLabel={`${label}: ${formatDateTime(value)}`}
        accessibilityRole="button"
      >
        <MaterialIcons name={icon} size={20} color="#797585" />
        <Text className="flex-1 text-body-md text-on-surface">{formatDateTime(value)}</Text>
        <MaterialIcons name="calendar-today" size={18} color="#1C1A23" />
      </Pressable>
      {step === "date" && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selected) => {
            if (event.type !== "set" || !selected) {
              setStep("none");
              return;
            }
            const next = new Date(value);
            next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
            onChange(next);
            setStep("time");
          }}
        />
      )}
      {step === "time" && (
        <DateTimePicker
          value={value}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selected) => {
            setStep("none");
            if (event.type !== "set" || !selected) return;
            const next = new Date(value);
            next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
            onChange(next);
          }}
        />
      )}
    </View>
  );
}

export default function PreApproveGuest() {
  const router = useRouter();
  const { type: typeParam } = useLocalSearchParams<{ type?: string }>();
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const [startTime, setStartTime] = useState(() => new Date());
  const [endTime, setEndTime] = useState(twoHoursFromNow);

  const initialType = VISITOR_TYPES.some((t) => t.value === typeParam)
    ? (typeParam as FormValues["type"])
    : "guest";

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", phone: "", type: initialType },
  });

  const selectedType = watch("type");

  // The screen is a hidden tab (href: null) and stays mounted between visits, so
  // defaultValues alone won't pick up a new ?type= from a later quick-action tap.
  useEffect(() => {
    if (VISITOR_TYPES.some((t) => t.value === typeParam)) {
      setValue("type", typeParam as FormValues["type"]);
    }
  }, [typeParam, setValue]);

  const preApproveMutation = trpc.visitors.preApprove.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Guest pre-approved", "success");
      utils.visitors.listPreApprovedForResident.invalidate();
      reset({ name: "", phone: "", type: selectedType });
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
      showToast("Valid-until must be after valid-from.", "error");
      return;
    }
    preApproveMutation.mutate({
      ...values,
      validFrom: startTime.toISOString(),
      validUntil: endTime.toISOString(),
    });
  }

  // Mockup chip order: Guest first, then the rest.
  const typeOptions = [...VISITOR_TYPES].sort((a, b) => (a.value === "guest" ? -1 : b.value === "guest" ? 1 : 0));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
      style={{ backgroundColor: "#FAF7FD" }}
    >
      <ScreenHeader
        title="Invite a Guest"
        subtitle="Generate a temporary access pass for your visitor."
        role="resident"
      />
      <ScrollView contentContainerClassName="gap-6 px-5 pb-8 pt-2" keyboardShouldPersistTaps="handled">
        <View className="gap-5 rounded-xl bg-surface p-5" style={shadowCard}>
          <View className="gap-2">
            <Text className="text-body-md font-bold text-on-surface">Name</Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  placeholder="E.g., Jane Doe"
                  leftElement={<MaterialIcons name="badge" size={20} color="#797585" />}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.name ? "Guest name is required" : undefined}
                />
              )}
            />
          </View>

          <View className="gap-2">
            <Text className="text-body-md font-bold text-on-surface">Phone Number (Optional)</Text>
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  placeholder="(555) 000-0000"
                  keyboardType="phone-pad"
                  leftElement={<MaterialIcons name="call" size={20} color="#797585" />}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.phone?.message}
                />
              )}
            />
          </View>
        </View>

        <View className="gap-3">
          <Text className="text-body-md font-bold text-on-surface">Visitor Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
            {typeOptions.map((t) => (
              <Chip
                key={t.value}
                label={t.label}
                icon={t.icon}
                selected={selectedType === t.value}
                onPress={() => setValue("type", t.value)}
              />
            ))}
          </ScrollView>
        </View>

        <View className="gap-5 rounded-xl bg-surface p-5" style={shadowCard}>
          <DateTimeField label="Valid From" icon="schedule" value={startTime} onChange={setStartTime} />
          <DateTimeField label="Valid Until" icon="history" value={endTime} onChange={setEndTime} />
        </View>

        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={preApproveMutation.isPending}
          className="mt-2 h-14 flex-row items-center justify-center gap-2 rounded-full"
          style={{ backgroundColor: "#7B5FE8" }}
          accessibilityLabel="Generate invite"
          accessibilityRole="button"
        >
          <MaterialIcons name="qr-code-2" size={22} color="#fff" />
          <Text className="text-body-lg font-bold" style={{ color: "#FFFFFF" }}>
            {preApproveMutation.isPending ? "Generating..." : "Generate Invite"}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.push("/(resident)/pre-approvals")} className="items-center">
          <Text className="text-body-md font-bold text-primary">View My Pre-approvals</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
