import { StaffAlertPopup } from "./staff-alert-popup";

/** Guard gate dashboard popup — resident alerts/messages, auto-replies as "Security". */
export function GuardAlertPopup() {
  return <StaffAlertPopup responder="security" />;
}
