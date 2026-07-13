import type { MaterialIcons } from "@expo/vector-icons";
import type { z } from "zod";
import type { visitorTypeSchema } from "@repo/services/visitor/model";

export type VisitorType = z.infer<typeof visitorTypeSchema>;

export const VISITOR_TYPES: {
  value: VisitorType;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
}[] = [
  { value: "delivery", label: "Delivery", icon: "local-shipping" },
  { value: "guest", label: "Guest", icon: "person" },
  { value: "cab", label: "Cab", icon: "local-taxi" },
  { value: "service", label: "Service", icon: "build" },
  { value: "other", label: "Other", icon: "more-horiz" },
];
