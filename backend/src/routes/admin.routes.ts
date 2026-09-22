import { Router } from "express";
import {
  authenticate,
  authorize,
} from "../middleware/auth";

const router = Router();

router.get(
  "/dashboard",
  authenticate,
  authorize("ADMIN"),
  (_req, res) => {
    res.json({
      success: true,
      message: "Welcome, Admin",
    });
  }
);

export default router;