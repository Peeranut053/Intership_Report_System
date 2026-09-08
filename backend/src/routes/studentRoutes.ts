import { Router } from "express";
import { getMyProfile, updateMyInfo, updateMyProfile } from "../controllers/studentController.js";
import { generateLeaveFormPdf } from "../controllers/documentController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";

const router = Router();

router.get("/me", authMiddleware, roleMiddleware("student"), getMyProfile);
router.put("/me", authMiddleware, roleMiddleware("student"), updateMyProfile);
router.put("/me/info", authMiddleware, roleMiddleware("student"), updateMyInfo);
router.get("/documents/leave-form", authMiddleware, roleMiddleware("student"), generateLeaveFormPdf);

export default router;
