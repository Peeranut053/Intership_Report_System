import { Router } from "express";
import {
  listMajors,
  listTeachers,
  listMentors,
  listReligions,
  listProvinces,
  listDistricts,
  listSubdistricts,
} from "../controllers/lookupController.js";

const router = Router();

// Public, read-only directory data — needed to populate the registration
// form's major/advisor/supervisor/mentor dropdowns before an account exists,
// and the student profile form's ศาสนา/จังหวัด/อำเภอ/ตำบล dropdowns.
router.get("/majors", listMajors);
router.get("/teachers", listTeachers);
router.get("/mentors", listMentors);
router.get("/religions", listReligions);
router.get("/provinces", listProvinces);
router.get("/districts", listDistricts);
router.get("/subdistricts", listSubdistricts);

export default router;
