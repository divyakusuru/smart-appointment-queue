
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

// Public: check available slots
router.get("/availability", checkAvailability);

// Customer: create booking
router.post("/", authenticate, bookAppointment);

// Customer: list own appointments
router.get("/mine", authenticate, getMyAppointments);

// Customer: cancel own appointment
router.patch("/:id/cancel", authenticate, cancelAppointment);

// Customer: reschedule own appointment
router.patch("/:id/reschedule", authenticate, rescheduleAppointment);

export default router;