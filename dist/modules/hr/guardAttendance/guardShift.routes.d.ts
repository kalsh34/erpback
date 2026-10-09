/**
 * Mounted at /api/attendance/shifts BEFORE the guardAttendance router so the
 * static '/shifts/...' paths never collide with '/:id/void'.
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=guardShift.routes.d.ts.map