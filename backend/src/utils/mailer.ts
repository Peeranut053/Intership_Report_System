import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env["SMTP_HOST"];
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP is not configured — set SMTP_HOST, SMTP_USER and SMTP_PASS in the server's .env to enable password-reset emails."
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env["SMTP_PORT"] ?? "587"),
    secure: process.env["SMTP_SECURE"] === "true",
    auth: { user, pass },
  });

  return transporter;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const from = process.env["SMTP_FROM"] ?? "Internship System <no-reply@example.com>";

  await getTransporter().sendMail({
    from,
    to,
    subject: "รีเซ็ตรหัสผ่าน - ระบบรายงานผลการฝึกประสบการณ์วิชาชีพ",
    text: `คลิกลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ลิงก์หมดอายุใน 30 นาที):\n\n${resetUrl}\n\nถ้าคุณไม่ได้ร้องขอเปลี่ยนรหัสผ่าน ไม่ต้องทำอะไร สามารถเพิกเฉยต่ออีเมลนี้ได้`,
    html: `
      <p>คลิกลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ลิงก์หมดอายุใน 30 นาที):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>ถ้าคุณไม่ได้ร้องขอเปลี่ยนรหัสผ่าน ไม่ต้องทำอะไร สามารถเพิกเฉยต่ออีเมลนี้ได้</p>
    `,
  });
}
