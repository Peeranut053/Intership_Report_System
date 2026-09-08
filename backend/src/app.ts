import express from "express";
import cors from "cors";
import pool from "./config/database.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import lookupRoutes from "./routes/lookupRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import mentorRoutes from "./routes/mentorRoutes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import { previewLeaveFormPdf } from "./controllers/documentController.js";

const app = express();

// Restrict cross-origin requests to known frontend origin(s) instead of
// allowing any site to call this API. Configure via CORS_ORIGIN in .env
// (comma-separated for multiple origins); defaults to the local Vite dev
// server so local development keeps working out of the box.
const allowedOrigins = (process.env["CORS_ORIGIN"] ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Lightweight security headers (avoids pulling in the helmet dependency).
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

app.use(express.json({ limit: "50kb" }));

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      message: "Backend and PostgreSQL are connected",
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// Auth routes
app.use("/api/auth", authRoutes);

// Admin routes (protected by ADMIN_API_KEY, not a user login — see adminAuth.ts)
app.use("/api/admin", adminRoutes);

// Public read-only directory data (majors/teachers/mentors) for registration dropdowns
app.use("/api", lookupRoutes);

// Student-only routes (profile header data + daily report CRUD)
app.use("/api/students", studentRoutes);
app.use("/api/reports", reportRoutes);

// Mentor-only routes (their assigned student roster)
app.use("/api/mentor", mentorRoutes);

// Teacher-only routes (their advisee/supervisee student roster)
app.use("/api/teacher", teacherRoutes);

// Design-time only: renders the leave-form PDF inline with no login, so it
// can be opened straight in a browser tab and refreshed after every save
// while working on the layout in documentController.ts (tsx watch restarts
// the server automatically). Safe to leave open since the template carries
// no personal data — but remove this route before a public deploy.
app.get("/api/documents/leave-form/preview", previewLeaveFormPdf);

export default app;