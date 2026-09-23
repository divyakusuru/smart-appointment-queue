
import { Router } from "express";
import {
  joinWaitlist,
  getMyWaitlist,
  leaveWaitlist,
} from "../controllers/waitlist.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/", authenticate, joinWaitlist);
router.get("/mine", authenticate, getMyWaitlist);
router.delete("/:id", authenticate, leaveWaitlist);

export default router;