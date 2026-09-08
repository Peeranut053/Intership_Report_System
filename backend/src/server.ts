import app from "./app.js";
import pool from "./config/database.js";

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    const result = await pool.query("SELECT NOW()");

    console.log("Database connected successfully");
    console.log("Database time:", result.rows[0].now);

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

startServer();