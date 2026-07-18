type Role = "resident" | "guard" | "admin";

/**
 * Maps a notification's `type` + the current user's role to the screen it should deep-link into.
 * `data` is the notification's payload (e.g. `{ complaintId }`) — used to open the exact record
 * rather than the generic list, so tapping "New reply on: …" lands on that ticket, not the whole feed.
 */
export function getNotificationRoute(type: string, role: Role, data?: Record<string, unknown> | null): string {
  const complaintId = typeof data?.complaintId === "string" ? data.complaintId : undefined;
  const complaintParam = complaintId ? `?complaintId=${complaintId}` : "";

  // A direct chat message → open the thread with the sender (residents only).
  if (type === "message" && role === "resident" && typeof data?.peerId === "string") {
    const peerName = typeof data?.peerName === "string" ? data.peerName : "Resident";
    return `/(resident)/chat?peerId=${data.peerId}&name=${encodeURIComponent(peerName)}`;
  }

  switch (type) {
    case "visitor_request":
      return role === "resident" ? "/(resident)/home" : "/(guard)/gate";
    case "visitor_decision":
      return "/(guard)/gate";
    case "notice":
      return "/(resident)/notices";
    case "poll":
      return "/(resident)/polls";
    case "complaint_status":
    case "complaint_comment":
      if (role === "resident") return `/(resident)/helpdesk${complaintParam}`;
      if (role === "admin") return `/(admin)/requests${complaintParam}`;
      // Guards can be assigned a complaint (Phase 6) and get this notification, but there's
      // no guard-facing complaint screen — fall back to their gate home instead of a route
      // their own role-guard would immediately bounce them out of.
      return "/(guard)/gate";
    case "booking_confirmed":
      return "/(resident)/amenities";
    default:
      switch (role) {
        case "resident":
          return "/(resident)/home";
        case "guard":
          return "/(guard)/gate";
        case "admin":
          return "/(admin)/dashboard";
      }
  }
}
