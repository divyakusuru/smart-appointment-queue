import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import {
  authenticate,
  authorize,
} from "../middleware/auth";

const router = Router();

 

router.get("/test-resource-route", (_req, res) => {
  return res.json({
    success: true,
    message: "Resource route file is loaded",
  });
});

const scheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  breakStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  breakEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

router.get("/:branchId/hours", async (req, res) => {
  const branchId = Number(req.params.branchId);

  if (!Number.isInteger(branchId) || branchId <= 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid branch ID",
      },
    });
  }

  const hours = await prisma.businessHour.findMany({
    where: { branchId },
    orderBy: { dayOfWeek: "asc" },
  });

  return res.json({
    success: true,
    data: hours,
  });
});

router.put(
  "/:branchId/hours",
  authenticate,
  authorize("ADMIN"),
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const parsed = z.array(scheduleSchema).safeParse(req.body);

    if (
      !Number.isInteger(branchId) ||
      branchId <= 0 ||
      !parsed.success
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid schedule data",
        },
      });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Branch not found",
        },
      });
    }

    const hours = await prisma.$transaction(async (tx) => {
      await tx.businessHour.deleteMany({
        where: { branchId },
      });

      await tx.businessHour.createMany({
        data: parsed.data.map((item) => ({
          ...item,
          branchId,
        })),
      });

      return tx.businessHour.findMany({
        where: { branchId },
        orderBy: { dayOfWeek: "asc" },
      });
    });

    return res.json({
      success: true,
      data: hours,
    });
  }
);

export default router;