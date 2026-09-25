import { Router } from "express";

import {
  joinWaitlist,
  getMyWaitlist,
  leaveWaitlist,
} from "../controllers/waitlist.controller";

import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", joinWaitlist);

router.get("/my", getMyWaitlist);

router.delete("/:id", leaveWaitlist);

export default router;