import type { Request, Response } from "express";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

// pdfkit ships with no Thai glyphs in its built-in fonts, so a Thai font must
// be embedded manually. Resolved relative to this compiled/running file
// (works whether run via tsx from src/ or compiled to dist/, since both sit
// as siblings under backend/) rather than relative to process.cwd().
//
// SETUP REQUIRED: "TH Sarabun PSK" is the standard font used on official
// Thai government/academic documents — files already placed at:
//   backend/assets/fonts/THSarabun.ttf        (regular weight)
//   backend/assets/fonts/THSarabun Bold.ttf   (bold weight — note the space
//                                              in the filename, kept as-is
//                                              since files here can't be
//                                              renamed after being written)
const FONT_REGULAR = fileURLToPath(new URL("../../assets/fonts/THSarabun.ttf", import.meta.url));
const FONT_BOLD = fileURLToPath(new URL("../../assets/fonts/THSarabun%20Bold.ttf", import.meta.url));

// Blank-line fill for paper-form fields. Plain ASCII periods render
// identically in every font (unlike the "…" ellipsis character used in an
// even earlier version, which the embedded Thai font has no glyph for —
// pdfkit silently fell back to a different font just for that character,
// making the blanks look visually inconsistent/"wrong" next to the
// surrounding Thai text). Dots are narrower than the underscores used
// before, so the repeat counts are higher to cover roughly the same width.
const LINE_LG = ".".repeat(60);
const LINE_MD = ".".repeat(36);
const LINE_SM = ".".repeat(14);

function fontsAvailable(): boolean {
  return existsSync(FONT_REGULAR) && existsSync(FONT_BOLD);
}

// All the actual page layout lives here — both the real download route and
// the design-time preview route call this, so they can never drift apart.
// Edit this function, save, and refresh the preview tab to see the change
// (tsx watch restarts the server automatically).
function renderLeaveForm(doc: PDFKit.PDFDocument): void {
  doc.font("THSarabunPSK-Bold").fontSize(18).text("แบบใบลาของนักศึกษาฝึกประสบการณ์วิชาชีพ (ฝึกงาน)", { align: "center" });
  doc.moveDown(1.2);
  doc.font("THSarabunPSK").fontSize(18);

  doc.text(`เขียนที่ ${LINE_LG}`, { align: "right" });
  doc.text(`วันที่ ${LINE_SM} เดือน ${LINE_MD} พ.ศ. ${LINE_SM}`, { align: "right" });
  doc.moveDown(0.8);

  doc.text(`เรื่อง ${LINE_LG}`);
  doc.text(`เรียน ${LINE_LG}`);
  doc.moveDown(0.4);

  doc.text(`        ด้วยข้าพเจ้า ${LINE_LG} (สาเหตุที่ลา) ${LINE_LG}`, { lineGap: 4 });
  doc.text(
    `จึงขอหยุดการฝึกประสบการณ์วิชาชีพ มีกำหนด ${LINE_SM} วัน นับตั้งแต่วันที่ ${LINE_SM} เดือน ${LINE_MD} พ.ศ. ${LINE_SM} ถึงวันที่ ${LINE_SM} เดือน ${LINE_MD} พ.ศ. ${LINE_SM} ครั้งสุดท้ายข้าพเจ้าได้ลา ${LINE_MD}`,
    { lineGap: 4 }
  );
  doc.text(
    `เมื่อวันที่ ${LINE_SM} เดือน ${LINE_MD} พ.ศ. ${LINE_SM} ถึงวันที่ ${LINE_SM} เดือน ${LINE_MD} พ.ศ. ${LINE_SM}`,
    { lineGap: 4 }
  );
  doc.moveDown(0.4);

  doc.text(
    `        ตลอดระยะเวลาการฝึกประสบการณ์วิชาชีพ ข้าพเจ้าได้ลามาแล้ว คือลาป่วย ${LINE_SM} วัน ลากิจ ${LINE_SM} วัน ในระหว่างที่ข้าพเจ้าลานี้ข้าพเจ้าพักอยู่บ้านเลขที่ ${LINE_SM} ถนน ${LINE_MD}`,
    { lineGap: 4 }
  );
  doc.text(`ตำบล ${LINE_MD} อำเภอ ${LINE_MD} จังหวัด ${LINE_MD} รหัสไปรษณีย์ ${LINE_SM}`, { lineGap: 4 });
  doc.text(`โทรศัพท์ ${LINE_MD}`, { lineGap: 4 });
  doc.moveDown(0.4);

  doc.text("        จึงเรียนมาเพื่อโปรดพิจารณาอนุญาต");
  doc.moveDown(1.6);

  doc.text("ขอแสดงความนับถือ", { align: "center" });
  doc.moveDown(2.4);
  doc.text(`(ลงชื่อ) ${LINE_LG}`, { align: "center" });
  doc.text(`(${LINE_LG})`, { align: "center" });
}

function streamLeaveFormPdf(res: Response, disposition: "attachment" | "inline"): void {
  if (!fontsAvailable()) {
    res.status(500).json({
      success: false,
      message: "ไม่พบไฟล์ฟอนต์ TH Sarabun PSK สำหรับสร้าง PDF (backend/assets/fonts/THSarabun.ttf, THSarabun Bold.ttf)",
    });
    return;
  }

  const doc = new PDFDocument({ size: "A4", margin: 56 });
  doc.registerFont("THSarabunPSK", FONT_REGULAR);
  doc.registerFont("THSarabunPSK-Bold", FONT_BOLD);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `${disposition}; filename="leave-form.pdf"`);
  doc.pipe(res);

  renderLeaveForm(doc);

  doc.end();
}

// GET /api/students/documents/leave-form — the real, student-facing route.
// Generates the ใบลา (leave request) as a downloadable, entirely blank PDF
// template matching the paper form on page 7 of the internship handbook.
// Intentionally not pre-filled with any student data — students print it,
// hand-write it, and physically sign it.
export function generateLeaveFormPdf(_req: Request, res: Response): void {
  streamLeaveFormPdf(res, "attachment");
}

// GET /api/documents/leave-form/preview — design-time only. Same content as
// above, but "inline" so a browser tab/iframe renders it directly instead of
// downloading a file, and with no auth so it can be opened straight from the
// address bar. Safe to leave open since the template carries no personal
// data, but remove or lock it down before a public deploy.
export function previewLeaveFormPdf(_req: Request, res: Response): void {
  streamLeaveFormPdf(res, "inline");
}
