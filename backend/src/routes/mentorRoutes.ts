import { Router } from "express";
import {
  getAttendanceForDate,
  getStudentEvaluation,
  getStudentReports,
  listMyStudents,
  saveAttendance,
  saveStudentEvaluation,
  setReportChecked,
} from "../controllers/mentorController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";

const router = Router();

router.get("/students", authMiddleware, roleMiddleware("mentor"), listMyStudents);
router.get("/students/:studentId/reports", authMiddleware, roleMiddleware("mentor"), getStudentReports);
router.put("/reports/:reportId/check", authMiddleware, roleMiddleware("mentor"), setReportChecked);
router.get("/attendance", authMiddleware, roleMiddleware("mentor"), getAttendanceForDate);
router.put("/attendance", authMiddleware, roleMiddleware("mentor"), saveAttendance);
router.get("/students/:studentId/evaluation", authMiddleware, roleMiddleware("mentor"), getStudentEvaluation);
router.put("/students/:studentId/evaluation", authMiddleware, roleMiddleware("mentor"), saveStudentEvaluation);

export default router;
