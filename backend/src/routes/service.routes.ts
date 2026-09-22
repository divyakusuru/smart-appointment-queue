import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import {
  authenticate,
  authorize,
} from "../middleware/auth";

const router = Router();

const createSchema = z.object({
  branchId: z.number().int().positive(),
  name: z.string().trim().min(2).max(100),
  description: z.string().max(500).optional(),
  duration: z.number().int().positive().max(480),
  price: z.number().nonnegative(),
  capacity: z.number().int().positive(),
});

router.get("/", async (req, res) => {
  const branchId = req.query.branchId
    ? Number(req.query.branchId)
    : undefined;

  const services = await prisma.service.findMany({
    where: {
      active: true,
      ...(branchId ? { branchId } : {}),
    },
    orderBy: { id: "asc" },
  });

  return res.json({
    success: true,
    data: services,
  });
});

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  async (req, res) => {
    const parsed = createSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid service data",
        },
      });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: parsed.data.branchId },
    });

    if (!branch || !branch.active) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_BRANCH",
          message: "Branch does not exist or is inactive",
        },
      });
    }

    const service = await prisma.service.create({
      data: {
        ...parsed.data,
        price: parsed.data.price,
      },
    });

    return res.status(201).json({
      success: true,
      data: service,
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
          message: "Invalid service ID",
        },
      });
    }

    const schema = createSchema.partial();
    const parsed = schema.safeParse(req.body);

    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid update data",
        },
      });
    }

    const service = await prisma.service.update({
      where: { id },
      data: parsed.data,
    });

    return res.json({
      success: true,
      data: service,
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
          message: "Invalid service ID",
        },
      });
    }

    const service = await prisma.service.update({
      where: { id },
      data: { active: false },
    });

    return res.json({
      success: true,
      data: service,
    });
  }
);

export default router;