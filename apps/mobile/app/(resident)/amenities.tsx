import { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Alert, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "../../lib/trpc";
import { useUiStore } from "../../stores/ui-store";
import { getErrorMessage } from "../../lib/error-message";
import { hapticSuccess, hapticError } from "../../lib/haptics";
import { ScreenHeader } from "../../components/ui/screen-header";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";
import { GroupLabel } from "../../components/ui/group-label";
import { ListLoading } from "../../components/ui/list-loading";
import { StatusDot } from "../../components/ui/status-dot";
import { shadowCard } from "../../lib/shadows";

function nextDays(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayLabel(date: Date, index: number) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return date.toLocaleDateString([], { weekday: "short", day: "numeric" });
}

const AMENITY_ICON: Record<string, React.ComponentProps<typeof MaterialIcons>["name"]> = {
  pool: "pool",
  clubhouse: "celebration",
  gym: "fitness-center",
  court: "sports-tennis",
};

function iconFor(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("pool")) return AMENITY_ICON.pool;
  if (lower.includes("gym") || lower.includes("fitness")) return AMENITY_ICON.gym;
  if (lower.includes("court") || lower.includes("tennis")) return AMENITY_ICON.court;
  return AMENITY_ICON.clubhouse;
}

export default function ResidentAmenities() {
  const showToast = useUiStore((s) => s.showToast);
  const utils = trpc.useUtils();
  const days = nextDays(7);
  const [bookingAmenityId, setBookingAmenityId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(dateKey(days[0]));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showBookings, setShowBookings] = useState(false);

  const amenitiesQuery = trpc.amenities.listForResident.useQuery();
  const slotsQuery = trpc.amenityBookings.availableSlots.useQuery(
    { amenityId: bookingAmenityId ?? "", date: selectedDate },
    { enabled: !!bookingAmenityId },
  );
  const myBookingsQuery = trpc.amenityBookings.myBookings.useQuery();

  const bookMutation = trpc.amenityBookings.create.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Booking confirmed", "success");
      setBookingAmenityId(null);
      setSelectedSlot(null);
      utils.amenityBookings.myBookings.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  const cancelMutation = trpc.amenityBookings.cancel.useMutation({
    onSuccess: () => {
      hapticSuccess();
      showToast("Booking cancelled", "success");
      utils.amenityBookings.myBookings.invalidate();
    },
    onError: (error) => {
      hapticError();
      showToast(getErrorMessage(error), "error");
    },
  });

  function confirmCancel(bookingId: string) {
    Alert.alert("Cancel booking?", "This will free up the slot for others.", [
      { text: "Keep it", style: "cancel" },
      { text: "Cancel Booking", style: "destructive", onPress: () => cancelMutation.mutate({ bookingId }) },
    ]);
  }

  function startBooking(amenityId: string) {
    setBookingAmenityId(bookingAmenityId === amenityId ? null : amenityId);
    setSelectedDate(dateKey(days[0]));
    setSelectedSlot(null);
  }

  const amenities = amenitiesQuery.data ?? [];
  const bookings = (myBookingsQuery.data ?? []).filter((b) => b.status === "confirmed");

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Book an Amenity" role="resident" />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={amenitiesQuery.isRefetching || myBookingsQuery.isRefetching}
            onRefresh={() => {
              amenitiesQuery.refetch();
              myBookingsQuery.refetch();
            }}
          />
        }
      >
        <Text className="text-headline-md font-extrabold text-on-surface">Available Facilities</Text>

        {amenitiesQuery.isLoading ? (
          <ListLoading />
        ) : amenitiesQuery.isError ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="Couldn't load facilities" description="Pull down to refresh and try again." icon="error-outline" />
          </View>
        ) : amenities.length === 0 ? (
          <View className="rounded-card bg-surface">
            <EmptyState title="No facilities yet" description="Society facilities will show up here." icon="pool" />
          </View>
        ) : (
          <View className="gap-3">
            {amenities.map((amenity) => {
              const selected = bookingAmenityId === amenity.id;
              return (
                <View
                  key={amenity.id}
                  className={`gap-3 rounded-card bg-surface p-4 ${selected ? "border-2 border-primary-container" : ""}`}
                  style={shadowCard}
                >
                  <Pressable
                    onPress={() => amenity.isActive && startBooking(amenity.id)}
                    disabled={!amenity.isActive}
                    className="flex-row items-center gap-3"
                  >
                    <View className={`h-12 w-12 items-center justify-center rounded-full ${selected ? "bg-primary-container" : "bg-surface-container"}`}>
                      <MaterialIcons name={iconFor(amenity.name)} size={22} color={selected ? "#fff" : "#6244CD"} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-body-md font-bold text-on-surface" numberOfLines={1}>
                        {amenity.name}
                      </Text>
                      <Text className="text-body-sm text-text-muted">Max capacity: {amenity.capacity}</Text>
                    </View>
                    {amenity.isActive ? (
                      <MaterialIcons name={selected ? "expand-less" : "expand-more"} size={22} color="#797585" />
                    ) : (
                      <View className="rounded-full bg-status-red/15 px-3 py-1.5">
                        <Text className="text-label-sm font-bold text-status-red-strong">Unavailable</Text>
                      </View>
                    )}
                  </Pressable>

                  {selected && (
                    <View className="gap-3 border-t border-outline-variant pt-3">
                      <Text className="text-label-caps uppercase text-text-muted">Select Date</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                        {days.map((day, index) => {
                          const key = dateKey(day);
                          const isSelected = key === selectedDate;
                          return (
                            <Pressable
                              key={key}
                              onPress={() => {
                                setSelectedDate(key);
                                setSelectedSlot(null);
                              }}
                              className={`items-center rounded-md px-3 py-2 ${isSelected ? "bg-primary-container" : "bg-surface-container"}`}
                            >
                              <Text className={`text-body-sm ${isSelected ? "font-bold text-white" : "text-on-surface-variant"}`}>
                                {dayLabel(day, index)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>

                      <Text className="text-label-caps uppercase text-text-muted">Available Times</Text>
                      {slotsQuery.isLoading ? (
                        <ActivityIndicator color="#6244CD" />
                      ) : (
                        <View className="flex-row flex-wrap gap-2">
                          {(slotsQuery.data ?? []).map((slot) => {
                            const isSelected = selectedSlot === slot.slotStart;
                            return (
                              <Pressable
                                key={slot.slotStart}
                                disabled={!slot.isAvailable}
                                onPress={() => setSelectedSlot(slot.slotStart)}
                                className={`rounded-md px-3 py-2 ${
                                  !slot.isAvailable
                                    ? "bg-surface-container opacity-40"
                                    : isSelected
                                      ? "bg-primary-container"
                                      : "bg-surface-container"
                                }`}
                              >
                                <Text className={`text-body-sm ${isSelected ? "font-bold text-white" : "text-on-surface-variant"}`}>
                                  {slot.slotStart}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}

                      {selectedSlot && (
                        <Text className="text-body-sm text-text-muted">
                          Selected: {dayLabel(days.find((d) => dateKey(d) === selectedDate) ?? days[0], days.findIndex((d) => dateKey(d) === selectedDate))}, {selectedSlot}
                        </Text>
                      )}

                      <Button
                        disabled={!selectedSlot}
                        loading={bookMutation.isPending}
                        onPress={() =>
                          selectedSlot &&
                          bookMutation.mutate({ amenityId: amenity.id, date: selectedDate, slotStart: selectedSlot })
                        }
                      >
                        Confirm Booking
                      </Button>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Pressable onPress={() => setShowBookings((v) => !v)} className="flex-row items-center gap-2 p-1">
          <MaterialIcons name={showBookings ? "expand-less" : "expand-more"} size={20} color="#6244CD" />
          <Text className="text-body-md font-bold text-primary-container">My Bookings ({bookings.length})</Text>
        </Pressable>

        {showBookings && (
          <View className="gap-2">
            {bookings.length === 0 ? (
              <Text className="px-1 text-body-sm text-text-muted">No upcoming bookings.</Text>
            ) : (
              <View className="gap-2">
                <GroupLabel label="Upcoming" />
                {bookings.map((booking) => (
                  <View key={booking.id} className="flex-row items-center gap-3 rounded-card bg-surface p-4" style={shadowCard}>
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-surface-container">
                      <MaterialIcons name={iconFor(booking.amenityName)} size={18} color="#6244CD" />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-body-md font-bold text-on-surface" numberOfLines={1}>
                        {booking.amenityName}
                      </Text>
                      <Text className="text-body-sm text-text-muted">
                        {booking.date} · {booking.slotStart.slice(0, 5)}–{booking.slotEnd.slice(0, 5)}
                      </Text>
                    </View>
                    <StatusDot label="Upcoming" tone="amber" />
                    <Pressable
                      onPress={() => confirmCancel(booking.id)}
                      hitSlop={8}
                      accessibilityLabel={`Cancel booking for ${booking.amenityName}`}
                      accessibilityRole="button"
                    >
                      <MaterialIcons name="close" size={18} color="#FF5F5F" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
