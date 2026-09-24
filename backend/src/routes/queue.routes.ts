import { Router } from "express";

import {
  getMyQueuePosition,
  getBranchQueue,
  addWalkIn,
  checkInQueueCustomer,
  callNextCustomer,
  startQueueService,
  completeQueueService,
  skipQueueCustomer,
  cancelQueueEntry,
} from "../controllers/queue.controller";

import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/walk-in", authenticate, addWalkIn);

router.patch("/next", authenticate, callNextCustomer);

router.patch("/:queueId/start", authenticate, startQueueService);

router.patch("/:queueId/complete", authenticate, completeQueueService);

router.patch("/:queueId/skip", authenticate, skipQueueCustomer);

router.patch("/:queueId/cancel", authenticate, cancelQueueEntry);

router.patch("/:queueId/check-in", authenticate, checkInQueueCustomer);

router.get("/mine", authenticate, getMyQueuePosition);

router.get("/", authenticate, getBranchQueue);

export default router;