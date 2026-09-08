// Shared date-formatting helpers for Thai (Buddhist calendar) display.
//
// `toDateOnly` treats the "YYYY-MM-DD" prefix of a date/timestamp string as
// local calendar-date components, rather than parsing the string directly
// with `new Date(isoString)`. A DATE-only value like "2026-10-19" (as
// returned for Postgres DATE columns — report_date, internship_start/end)
// is parsed by JS as UTC MIDNIGHT. Rendering that with `toLocaleDateString`
// then uses the *browser/runtime's local timezone*, which can shift the
// displayed calendar day backward by one whenever that timezone is behind
// UTC — a student saves "19 ต.ค." and the app shows "18 ต.ค." back to them.
// Building the Date from local Y/M/D components instead sidesteps the whole
// UTC-conversion step, so the displayed day always matches what was saved
// regardless of the viewer's timezone.
export function toDateOnly(value: string): Date {
  const isoDay = value.slice(0, 10);
  const [y, m, d] = isoDay.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

// For a DATE-only value (no time component) — report_date, internship_start,
// internship_end, check_date, etc. Always use this instead of formatting
// `new Date(isoDate)` directly.
export function formatThaiDate(isoDate: string): string {
  try {
    return toDateOnly(isoDate).toLocaleDateString("th-TH-u-ca-buddhist", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

// Whole calendar days from `start` to `end`, inclusive of both ends (e.g.
// the same day counts as 1). Both Date objects should come from toDateOnly
// so the difference is a clean whole number of days.
export function daysBetweenInclusive(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

// Today's date as "YYYY-MM-DD" using LOCAL Y/M/D components — not
// `new Date().toISOString().slice(0, 10)`, which converts to UTC first and
// can report yesterday's date for a few hours after local midnight in any
// timezone ahead of UTC (e.g. Thailand, UTC+7).
export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

// Splits a "YYYY-MM-DD" value into separate day/month-name/Buddhist-year
// pieces, for filling the "วันที่...เดือน...พ.ศ...." blanks used on printed
// paper-style forms (e.g. ใบลา). An empty/missing value returns dotted
// placeholders so an unfilled field still reads like a blank line on paper.
export function formatThaiDateParts(isoDate: string | null | undefined): {
  day: string;
  month: string;
  yearBE: string;
} {
  if (!isoDate) {
    return { day: "..........", month: "..........................", yearBE: ".........." };
  }
  const d = toDateOnly(isoDate);
  return {
    day: String(d.getDate()),
    month: THAI_MONTHS[d.getMonth()] ?? "",
    yearBE: String(d.getFullYear() + 543),
  };
}

// For a real TIMESTAMPTZ value (created_at, updated_at, checked_at) — these
// carry an actual instant + offset, so parsing with `new Date(...)` directly
// is correct here; there's no date-only ambiguity to guard against.
export function formatThaiDateTime(isoTimestamp: string): string {
  try {
    return new Date(isoTimestamp).toLocaleString("th-TH-u-ca-buddhist", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoTimestamp;
  }
}
