import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Smart Appointment API is running",
  });
});

export default app;