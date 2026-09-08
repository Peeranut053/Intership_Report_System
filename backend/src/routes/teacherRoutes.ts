import { Router } from "express";
import {
  createSupervision,
  deleteSupervision,
  getNotebookEvaluation,
  getStudentSupervisions,
  listMyStudents,
  saveNotebookEvaluation,
  updateSupervision,
} from "../controllers/teacherController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";

const router = Router();

router.get("/students", authMiddleware, roleMiddleware("teacher"), listMyStudents);
router.get(
  "/students/:studentId/supervisions",
  authMiddleware,
  roleMiddleware("teacher"),
  getStudentSupervisions
);
router.post(
  "/students/:studentId/supervisions",
  authMiddleware,
  roleMiddleware("teacher"),
  createSupervision
);
router.put("/supervisions/:supervisionId", authMiddleware, roleMiddleware("teacher"), updateSupervision);
router.delete("/supervisions/:supervisionId", authMiddleware, roleMiddleware("teacher"), deleteSupervision);

router.get(
  "/students/:studentId/notebook-evaluation",
  authMiddleware,
  roleMiddleware("teacher"),
  getNotebookEvaluation
);
router.put(
  "/students/:studentId/notebook-evaluation",
  authMiddleware,
  roleMiddleware("teacher"),
  saveNotebookEvaluation
);

export default router;
