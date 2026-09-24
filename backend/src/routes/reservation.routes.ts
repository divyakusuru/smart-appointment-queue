import { Router } from "express";

import {
  createReservation,
  getMyReservations,
  cancelReservation,
} from "../controllers/reservation.controller";

import { authenticate } from "../middleware/auth";

const router = Router();

router.post(
  "/",
  authenticate,
  createReservation
);

router.get(
  "/mine",
  authenticate,
  getMyReservations
);

router.delete(
  "/:id",
  authenticate,
  cancelReservation
);

export default router;