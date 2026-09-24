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
    message: "Service resource routes are loaded",
  });
});

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

// GET resources assigned to a service
router.get("/:id/resources", async (req, res) => {
  try {
    const serviceId = Number(req.params.id);

    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid service ID",
        },
      });
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        error: {
          code: "SERVICE_NOT_FOUND",
          message: "Service not found",
        },
      });
    }

    const assignments = await prisma.serviceResource.findMany({
      where: {
        serviceId,
        resource: {
          active: true,
        },
      },
      include: {
        resource: true,
      },
      orderBy: {
        resourceId: "asc",
      },
    });

    return res.json({
      success: true,
      data: assignments.map((item) => item.resource),
    });
  } catch (error) {
    console.error("Get service resources error:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to get service resources",
      },
    });
  }
});

// Replace all resource assignments for a service
router.put(
  "/:id/resources",
  authenticate,
  authorize("ADMIN"),
  async (req, res) => {
    try {
      const serviceId = Number(req.params.id);

      if (!Number.isInteger(serviceId) || serviceId <= 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid service ID",
          },
        });
      }

      const parsed = z
        .object({
          resourceIds: z
            .array(z.number().int().positive())
            .max(100),
        })
        .safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "resourceIds must be an array of positive integers",
          },
        });
      }

      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          error: {
            code: "SERVICE_NOT_FOUND",
            message: "Service not found",
          },
        });
      }

      const resourceIds = [...new Set(parsed.data.resourceIds)];

      // Make sure every resource belongs to the same branch
      const resources = await prisma.resource.findMany({
        where: {
          id: {
            in: resourceIds,
          },
          branchId: service.branchId,
          active: true,
        },
      });

      if (resources.length !== resourceIds.length) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_RESOURCES",
            message:
              "One or more resources do not belong to this service's branch or are inactive",
          },
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.serviceResource.deleteMany({
          where: {
            serviceId,
          },
        });

        if (resourceIds.length > 0) {
          await tx.serviceResource.createMany({
            data: resourceIds.map((resourceId) => ({
              serviceId,
              resourceId,
            })),
          });
        }
      });

      const assignments = await prisma.serviceResource.findMany({
        where: {
          serviceId,
        },
        include: {
          resource: true,
        },
        orderBy: {
          resourceId: "asc",
        },
      });

      return res.json({
        success: true,
        message: "Service resources updated successfully",
        data: assignments.map((item) => item.resource),
      });
    } catch (error) {
      console.error("Update service resources error:", error);

      return res.status(500).json({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to update service resources",
        },
      });
    }
  }
);
export default router;