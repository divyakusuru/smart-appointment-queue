import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import branchRoutes from "./routes/branch.routes";
import serviceRoutes from "./routes/service.routes";
import resourceRoutes from "./routes/resource.routes";
import scheduleRoutes from "./routes/schedule.routes";
import holidayRoutes from "./routes/holiday.routes";
import appointmentRoutes from "./routes/appointment.routes";
import queueRoutes from "./routes/queue.routes";
import waitlistRoutes from "./routes/waitlist.routes";
import reservationRoutes from "./routes/reservation.routes";
import "./services/reservation.expiry.worker";

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/branches", scheduleRoutes);
app.use("/api/branches", holidayRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/reservations", reservationRoutes);

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Smart Appointment API is running",
  });
});

export default app;