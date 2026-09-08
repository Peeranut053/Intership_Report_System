import { Router } from "express";
import { listMyReports, createReport, updateReport, deleteReport } from "../controllers/reportController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";

const router = Router();

// Only students submit their own daily reports (mentor review happens on a
// separate report_checks table/endpoint — not built yet).
router.use(authMiddleware, roleMiddleware("student"));

router.get("/", listMyReports);
router.post("/", createReport);
router.put("/:id", updateReport);
router.delete("/:id", deleteReport);

export default router;
