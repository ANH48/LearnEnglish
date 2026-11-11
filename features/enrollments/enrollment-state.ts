// Allowed moves of an enrollment. Only `approved` opens a course's content.

export type EnrollmentStatus = "pending" | "approved" | "rejected" | "cancelled";

export type EnrollmentEvent =
  | "request" // learner asks to join (first time, or again after rejected / cancelled)
  | "cancel" // learner withdraws a pending request
  | "approve" // teacher accepts
  | "reject" // teacher declines
  | "remove"; // teacher removes an approved learner from the course

const TRANSITIONS: Record<EnrollmentEvent, { from: (EnrollmentStatus | null)[]; to: EnrollmentStatus }> = {
  request: { from: [null, "rejected", "cancelled"], to: "pending" },
  cancel: { from: ["pending"], to: "cancelled" },
  approve: { from: ["pending"], to: "approved" },
  reject: { from: ["pending"], to: "rejected" },
  remove: { from: ["approved"], to: "cancelled" },
};

/** The status after the event, or null when the move is not allowed. `current` is null when no enrollment exists yet. */
export function nextEnrollmentStatus(current: EnrollmentStatus | null, event: EnrollmentEvent): EnrollmentStatus | null {
  const rule = TRANSITIONS[event];
  return rule.from.includes(current) ? rule.to : null;
}

export const ENROLLMENT_STATUS_LABEL: Record<EnrollmentStatus, string> = {
  pending: "Đang chờ duyệt",
  approved: "Đã được duyệt",
  rejected: "Bị từ chối",
  cancelled: "Đã hủy",
};
