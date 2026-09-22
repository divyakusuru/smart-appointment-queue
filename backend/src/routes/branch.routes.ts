import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import {
  authenticate,
  authorize,
} from "../middleware/auth";

const router = Router();

const branchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().min(3).max(300),
  contact: z.string().max(30).optional(),
});

const updateSchema = branchSchema.partial().extend({
  active: z.boolean().optional(),
});

router.get("/", async (_req, res) => {
  const branches = await prisma.branch.findMany({
    orderBy: { id: "asc" },
  });

  res.json({
    success: true,
    data: branches,
  });
});

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  async (req, res) => {
    const parsed = branchSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid branch data",
        },
      });
    }

    const branch = await prisma.branch.create({
      data: parsed.data,
    });

    return res.status(201).json({
      success: true,
      data: branch,
    });
  }
);

router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid branch ID",
        },
      });
    }

    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid update data",
        },
      });
    }

    const existing = await prisma.branch.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Branch not found",
        },
      });
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: parsed.data,
    });

    return res.json({
      success: true,
      data: branch,
    });
  }
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid branch ID",
        },
      });
    }

    const existing = await prisma.branch.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Branch not found",
        },
      });
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: { active: false },
    });

    return res.json({
      success: true,
      data: branch,
    });
  }
);

export default router;