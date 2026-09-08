import { useState } from "react";
import { downloadLeaveFormPdf } from "../api";

interface StudentDocumentsPageProps {
  token: string;
}

type DocumentKey = "leave-form";

interface DocumentItem {
  key: DocumentKey;
  title: string;
  description: string;
}

const DOCUMENTS: DocumentItem[] = [
  {
    key: "leave-form",
    title: "แบบใบลาของนักศึกษาฝึกประสบการณ์วิชาชีพ (ฝึกงาน)",
    description: "ดาวน์โหลดแบบฟอร์มเปล่า สำหรับพิมพ์ กรอกด้วยลายมือ และเซ็นชื่อยื่นลาด้วยตนเอง",
  },
];

// Only one document today, so this always downloads the leave form — the
// key is kept so this reads cleanly once more documents are added.
const DOWNLOAD_FNS: Record<DocumentKey, (token: string) => Promise<void>> = {
  "leave-form": downloadLeaveFormPdf,
};

export function StudentDocumentsPage({ token }: StudentDocumentsPageProps) {
  const [downloadingKey, setDownloadingKey] = useState<DocumentKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(key: DocumentKey) {
    if (downloadingKey) return;
    setDownloadingKey(key);
    setError(null);
    try {
      await DOWNLOAD_FNS[key](token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ดาวน์โหลดเอกสารไม่สำเร็จ");
    } finally {
      setDownloadingKey(null);
    }
  }

  return (
    <div className="report-page">
      <div className="report-card">
        <h2 className="report-title">ดาวน์โหลดเอกสาร</h2>
        <p className="auth-hint">เลือกเอกสารที่ต้องการดาวน์โหลด</p>
        {error && <p className="form-error">{error}</p>}

        <ul className="report-history-list">
          {DOCUMENTS.map((doc) => (
            <li key={doc.key} className="report-history-item mentor-table-row">
              <div>
                <div className="report-history-date">{doc.title}</div>
                <p className="mentor-report-desc">{doc.description}</p>
              </div>
              <div className="report-history-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleDownload(doc.key)}
                  disabled={downloadingKey === doc.key}
                >
                  {downloadingKey === doc.key ? "กำลังดาวน์โหลด..." : "ดาวน์โหลด"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
