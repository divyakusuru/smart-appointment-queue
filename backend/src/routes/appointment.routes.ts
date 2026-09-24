
import { Router } from "express";

import {
  checkAvailability,
  bookAppointment,
  getMyAppointments,
  cancelAppointment,
  rescheduleAppointment,
} from "../controllers/appointment.controller";

import { authenticate } from "../middleware/auth";

const router = Router();

// Check available slots
router.get("/availability", checkAvailability);

// Create booking
router.post("/", authenticate, bookAppointment);

// List customer's appointments
router.get("/mine", authenticate, getMyAppointments);

// Cancel customer's appointment
router.patch("/:id/cancel", authenticate, cancelAppointment);

// Reschedule customer's appointment
router.patch("/:id/reschedule", authenticate, rescheduleAppointment);

export default router;