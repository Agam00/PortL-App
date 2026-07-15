import type { VisitorOutput } from "@repo/services/visitor/model";

export const VISITOR_STATUS_TONE: Record<VisitorOutput["status"], "green" | "amber" | "red" | "neutral"> = {
  pending: "amber",
  approved: "green",
  checked_in: "green",
  rejected: "red",
  expired: "neutral",
  checked_out: "neutral",
};

export const VISITOR_STATUS_LABEL: Record<VisitorOutput["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  checked_in: "Checked in",
  rejected: "Rejected",
  expired: "Expired",
  checked_out: "Checked out",
};

export const VISITOR_TYPE_LABEL: Record<VisitorOutput["type"], string> = {
  delivery: "Delivery",
  guest: "Guest",
  cab: "Cab",
  service: "Service",
  other: "Other",
};
