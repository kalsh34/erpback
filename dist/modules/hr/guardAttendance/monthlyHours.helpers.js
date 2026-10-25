"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOfDay = startOfDay;
exports.round2 = round2;
/** Local-midnight helpers + 2-decimal rounding shared by the monthly-hours module. */
function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
function round2(n) {
    return Math.round(n * 100) / 100;
}
//# sourceMappingURL=monthlyHours.helpers.js.map