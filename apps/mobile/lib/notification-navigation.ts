type Role = "resident" | "guard" | "admin";

/** Maps a notification's `type` + the current user's role to the screen it should deep-link into. */
export function getNotificationRoute(type: string, role: Role): string {
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
      return role === "resident" ? "/(resident)/helpdesk" : "/(admin)/requests";
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
