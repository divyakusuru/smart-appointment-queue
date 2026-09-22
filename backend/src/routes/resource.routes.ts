import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import {
  authenticate,
  authorize,
} from "../middleware/auth";

const router = Router();

const resourceSchema = z.object({
  branchId: z.number().int().positive(),
  name: z.string().trim().min(2).max(100),
});

router.get("/", async (req, res) => {
  const branchId = req.query.branchId
    ? Number(req.query.branchId)
    : undefined;

  const resources = await prisma.resource.findMany({
    where: {
      active: true,
      ...(branchId ? { branchId } : {}),
    },
    orderBy: { id: "asc" },
  });

  return res.json({
    success: true,
    data: resources,
  });
});

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  async (req, res) => {
    const parsed = resourceSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid resource data",
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

    const resource = await prisma.resource.create({
      data: parsed.data,
    });

    return res.status(201).json({
      success: true,
      data: resource,
    });
  }
);

router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  async (req, res) => {
    const id = Number(req.params.id);

    const parsed = z.object({
      name: z.string().trim().min(2).max(100).optional(),
      active: z.boolean().optional(),
    }).safeParse(req.body);

    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      !parsed.success ||
      Object.keys(parsed.data).length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid resource update",
        },
      });
    }

    const resource = await prisma.resource.update({
      where: { id },
      data: parsed.data,
    });

    return res.json({
      success: true,
      data: resource,
    });
  }
);

export default router;