import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth";

// POST /api/waitlist
// Customer joins the waitlist
export const joinWaitlist = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    const {
      branchId,
      serviceId,
      requestedDate,
      requestedTime,
    } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Please login first",
      });
      return;
    }

    if (!branchId || !serviceId || !requestedDate) {
      res.status(400).json({
        success: false,
        message:
          "branchId, serviceId and requestedDate are required",
      });
      return;
    }

    const branchIdNumber = Number(branchId);
    const serviceIdNumber = Number(serviceId);

    if (
      !Number.isInteger(branchIdNumber) ||
      !Number.isInteger(serviceIdNumber)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid branchId or serviceId",
      });
      return;
    }

    // Validate date
    const date = new Date(`${requestedDate}T00:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== requestedDate
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid requestedDate",
      });
      return;
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (date < today) {
      res.status(400).json({
        success: false,
        message: "Requested date cannot be in the past",
      });
      return;
    }

    // Check branch
    const branch = await prisma.branch.findUnique({
      where: {
        id: branchIdNumber,
      },
    });

    if (!branch || !branch.active) {
      res.status(404).json({
        success: false,
        message: "Branch not found or inactive",
      });
      return;
    }

    // Check service
    const service = await prisma.service.findUnique({
      where: {
        id: serviceIdNumber,
      },
    });

    if (
      !service ||
      !service.active ||
      service.branchId !== branchIdNumber
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid service for this branch",
      });
      return;
    }

    // Check duplicate waitlist entry
    const existingEntry = await prisma.waitlist.findFirst({
      where: {
        userId,
        branchId: branchIdNumber,
        serviceId: serviceIdNumber,
        requestedDate: date,
        requestedTime: requestedTime || null,
        status: "WAITING",
      },
    });

    if (existingEntry) {
      res.status(409).json({
        success: false,
        message: "You are already on the waitlist for this slot",
      });
      return;
    }

    // Create waitlist entry
    const entry = await prisma.waitlist.create({
      data: {
        userId,
        branchId: branchIdNumber,
        serviceId: serviceIdNumber,
        requestedDate: date,
        requestedTime: requestedTime || null,
        status: "WAITING",
      },
      include: {
        branch: true,
        service: true,
      },
    });

    // Calculate position
    const position = await prisma.waitlist.count({
      where: {
        branchId: branchIdNumber,
        serviceId: serviceIdNumber,
        requestedDate: date,
        status: "WAITING",
        createdAt: {
          lte: entry.createdAt,
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Successfully joined the waitlist",
      data: {
        ...entry,
        position,
      },
    });
  } catch (error) {
    console.error("Join waitlist error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to join waitlist",
    });
  }
};

// GET /api/waitlist
// Customer views their waitlist entries
export const getMyWaitlist = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Please login first",
      });
      return;
    }

    const entries = await prisma.waitlist.findMany({
      where: {
        userId,
      },
      include: {
        branch: true,
        service: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const entriesWithPosition = await Promise.all(
      entries.map(async (entry) => {
        const position = await prisma.waitlist.count({
          where: {
            branchId: entry.branchId,
            serviceId: entry.serviceId,
            requestedDate: entry.requestedDate,
            status: "WAITING",
            createdAt: {
              lte: entry.createdAt,
            },
          },
        });

        return {
          ...entry,
          position:
            entry.status === "WAITING"
              ? position
              : null,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: entriesWithPosition.length,
      waitlist: entriesWithPosition,
    });
  } catch (error) {
    console.error("Get waitlist error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch waitlist",
    });
  }
};

// DELETE /api/waitlist/:id
// Customer cancels their own waitlist entry
export const leaveWaitlist = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const entryId = Number(req.params.id);

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Please login first",
      });
      return;
    }

    if (!Number.isInteger(entryId) || entryId <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid waitlist ID",
      });
      return;
    }

    const entry = await prisma.waitlist.findUnique({
      where: {
        id: entryId,
      },
    });

    if (!entry || entry.userId !== userId) {
      res.status(404).json({
        success: false,
        message: "Waitlist entry not found",
      });
      return;
    }

    if (entry.status !== "WAITING") {
      res.status(400).json({
        success: false,
        message: "Only waiting entries can be cancelled",
      });
      return;
    }

    const updatedEntry = await prisma.waitlist.update({
      where: {
        id: entryId,
      },
      data: {
        status: "CANCELLED",
      },
    });

    res.status(200).json({
      success: true,
      message: "You have left the waitlist",
      data: updatedEntry,
    });
  } catch (error) {
    console.error("Leave waitlist error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to leave waitlist",
    });
  }
};