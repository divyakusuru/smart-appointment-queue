import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import {
  authenticate,
  authorize,
} from "../middleware/auth";

const router = Router();

const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(200).optional(),
});

router.get("/:branchId/holidays", async (req, res) => {
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

  const holidays = await prisma.holiday.findMany({
    where: { branchId },
    orderBy: { date: "asc" },
  });

  return res.json({
    success: true,
    data: holidays,
  });
});

router.post(
  "/:branchId/holidays",
  authenticate,
  authorize("ADMIN"),
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const parsed = holidaySchema.safeParse(req.body);

    if (
      !Number.isInteger(branchId) ||
      branchId <= 0 ||
      !parsed.success
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid holiday data",
        },
      });
    }

    const date = new Date(`${parsed.data.date}T00:00:00.000Z`);

    const holiday = await prisma.holiday.create({
      data: {
        branchId,
        date,
        description: parsed.data.description,
      },
    });

    return res.status(201).json({
      success: true,
      data: holiday,
    });
  }
);

router.delete(
  "/:branchId/holidays/:holidayId",
  authenticate,
  authorize("ADMIN"),
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const holidayId = Number(req.params.holidayId);

    if (
      !Number.isInteger(branchId) ||
      !Number.isInteger(holidayId) ||
      branchId <= 0 ||
      holidayId <= 0
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid IDs",
        },
      });
    }

    const result = await prisma.holiday.deleteMany({
      where: {
        id: holidayId,
        branchId,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Holiday not found",
        },
      });
    }

    return res.json({
      success: true,
      message: "Holiday deleted",
    });
  }
);

export default router;