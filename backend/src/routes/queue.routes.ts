
import { Router } from "express";

import {
  getMyQueuePosition,
  getBranchQueue,
} from "../controllers/queue.controller";

import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/mine", authenticate, getMyQueuePosition);

router.get("/", authenticate, getBranchQueue);

export default router;