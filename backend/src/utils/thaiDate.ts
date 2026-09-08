// Server-side counterpart to frontend/src/utils/dateFormat.ts's
// formatThaiDateParts — used when laying out paper-style documents (ใบลา,
// etc.) with pdfkit, where the dotted-blank substitution happens in the
// document layout code itself rather than here. An empty/invalid date
// returns empty strings for each part so the caller's own blank-filling
// logic kicks in.
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

export function formatThaiDateParts(isoDate: string | null | undefined): {
  day: string;
  month: string;
  yearBE: string;
} {
  if (!isoDate) {
    return { day: "", month: "", yearBE: "" };
  }
  const isoDay = isoDate.slice(0, 10);
  const parts = isoDay.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) {
    return { day: "", month: "", yearBE: "" };
  }
  return {
    day: String(d),
    month: THAI_MONTHS[m - 1] ?? "",
    yearBE: String(y + 543),
  };
}
