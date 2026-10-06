/** Local-midnight helpers + 2-decimal rounding shared by the monthly-hours module. */
export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
