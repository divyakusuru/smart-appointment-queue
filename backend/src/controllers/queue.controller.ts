
import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../config/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

const queueQuerySchema = z.object({
  branchId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
const walkInSchema = z.object({
  name: z.string().min(2).max(100),
  branchId: z.coerce.number().int().positive(),
  serviceId: z.coerce.number().int().positive(),
  priority: z.enum(["NORMAL", "PRIORITY", "EMERGENCY"]).default("NORMAL"),
});

// POST /api/queue/walk-in
export const addWalkIn = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (user.role !== "STAFF" && user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only staff or admin can add walk-ins",
      });
    }

    const parsed = walkInSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid walk-in data",
        errors: parsed.error.flatten(),
      });
    }

    const {
      name,
      branchId,
      serviceId,
      priority,
    } = parsed.data;

    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Check branch
        const branch = await tx.branch.findUnique({
          where: { id: branchId },
        });

        if (!branch || !branch.active) {
          throw new Error("BRANCH_NOT_FOUND");
        }

        // 2. Check service
        const service = await tx.service.findUnique({
          where: { id: serviceId },
        });

        if (
          !service ||
          !service.active ||
          service.branchId !== branchId
        ) {
          throw new Error("SERVICE_NOT_FOUND");
        }

        // 3. Create temporary customer
        const temporaryEmail =
          `walkin-${randomUUID()}@queue.local`;

        const passwordHash = await bcrypt.hash(
          randomUUID(),
          10
        );

        const walkInUser = await tx.user.create({
          data: {
            name,
            email: temporaryEmail,
            passwordHash,
            role: "CUSTOMER",
          },
        });

        // 4. Get today's date
        const today = new Date();

        const appointmentDate = new Date(
          Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate()
          )
        );

        // 5. Find the last queue position
        const lastQueue = await tx.queue.findFirst({
          where: {
            branchId,
            queueDate: appointmentDate,
          },
          orderBy: {
            position: "desc",
          },
        });

        const position = (lastQueue?.position ?? 0) + 1;

        // 6. Use current time as walk-in start time
        const startTime = new Date();

        const endTime = new Date(
          startTime.getTime() + service.duration * 60 * 1000
        );

        // 7. Create appointment
        const appointmentNumber =
          `WALKIN-${Date.now()}-${randomUUID().slice(0, 8)}`;

        const appointment = await tx.appointment.create({
          data: {
            appointmentNumber,
            userId: walkInUser.id,
            branchId,
            serviceId,
            appointmentDate,
            startTime,
            endTime,
            status: "CHECKED_IN",
            notes: "Walk-in customer",
          },
        });

        // 8. Create queue entry
        const queueEntry = await tx.queue.create({
          data: {
            appointmentId: appointment.id,
            userId: walkInUser.id,
            branchId,
            queueDate: appointmentDate,
            position,
            priority,
            status: "WAITING",
          },
        });

        return {
          appointment,
          queueEntry,
          customer: {
            id: walkInUser.id,
            name: walkInUser.name,
          },
        };
      },
      {
        isolationLevel: "Serializable",
      }
    );

    return res.status(201).json({
      success: true,
      data: result,
      message: "Walk-in customer added to queue",
    });
  } catch (error) {
    console.error("ADD WALK-IN ERROR:", error);

    if (
      error instanceof Error &&
      error.message === "BRANCH_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message: "Branch not found or inactive",
      });
    }

    if (
      error instanceof Error &&
      error.message === "SERVICE_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message: "Service not found, inactive, or belongs to another branch",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to add walk-in customer",
    });
  }
};

// PATCH /api/queue/:queueId/check-in
export const checkInQueueCustomer = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (user.role !== "STAFF" && user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only staff or admin can check in customers",
      });
    }

    const queueId = Number(req.params.queueId);

    if (!Number.isInteger(queueId) || queueId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid queue ID",
      });
    }

    const queueEntry = await prisma.queue.findUnique({
      where: {
        id: queueId,
      },
      include: {
        appointment: true,
      },
    });

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: "Queue entry not found",
      });
    }

    if (queueEntry.status !== "WAITING") {
      return res.status(409).json({
        success: false,
        message: `Cannot check in a queue entry with status ${queueEntry.status}`,
      });
    }

    if (queueEntry.appointment.status === "CANCELLED") {
      return res.status(409).json({
        success: false,
        message: "Cancelled appointment cannot be checked in",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.update({
        where: {
          id: queueEntry.appointmentId,
        },
        data: {
          status: "CHECKED_IN",
        },
      });

      return appointment;
    });

    return res.json({
      success: true,
      data: {
        queueId: queueEntry.id,
        appointmentId: result.id,
        appointmentStatus: result.status,
        queueStatus: queueEntry.status,
      },
      message: "Customer checked in successfully",
    });
  } catch (error) {
    console.error("CHECK-IN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to check in customer",
    });
  }
};

// PATCH /api/queue/next
export const callNextCustomer = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (user.role !== "STAFF" && user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only staff or admin can call customers",
      });
    }

    const branchId = Number(req.body.branchId);

    if (!Number.isInteger(branchId) || branchId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid branchId is required",
      });
    }

    const today = new Date();

    const queueDate = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate()
      )
    );

    const result = await prisma.$transaction(
      async (tx) => {
        // Find the next waiting customer.
       const waitingCustomers = await tx.queue.findMany({
  where: {
    branchId,
    queueDate,
    status: "WAITING",
  },
  include: {
    appointment: true,
  },
  orderBy: {
    position: "asc",
  },
});

if (waitingCustomers.length === 0) {
  return null;
}

const priorityRank = {
  EMERGENCY: 3,
  PRIORITY: 2,
  NORMAL: 1,
};

waitingCustomers.sort(
  (a, b) =>
    priorityRank[b.priority] - priorityRank[a.priority] ||
    a.position - b.position
);

const nextCustomer = waitingCustomers[0];
        // Mark queue entry as CALLED.
        const updatedQueue = await tx.queue.update({
          where: {
            id: nextCustomer.id,
          },
          data: {
            status: "CALLED",
            calledAt: new Date(),
          },
          include: {
            appointment: true,
          },
        });

        // Update appointment status.
        await tx.appointment.update({
          where: {
            id: nextCustomer.appointmentId,
          },
          data: {
            status: "CHECKED_IN",
          },
        });

        return updatedQueue;
      },
      {
        isolationLevel: "Serializable",
      }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "No customers are waiting in the queue",
      });
    }

    return res.json({
      success: true,
      data: {
        queueId: result.id,
        appointmentId: result.appointmentId,
        appointmentNumber: result.appointment.appointmentNumber,
        position: result.position,
        priority: result.priority,
        status: result.status,
        calledAt: result.calledAt,
      },
      message: "Next customer called",
    });
  } catch (error) {
    console.error("CALL NEXT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to call next customer",
    });
  }
};
// GET /api/queue/mine
export const getMyQueuePosition = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const parsed = queueQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "branchId and date are required",
      });
    }

    const { branchId, date } = parsed.data;

    const appointments = await prisma.appointment.findMany({
      where: {
        branchId,
        appointmentDate: new Date(`${date}T00:00:00.000Z`),
        status: {
          not: "CANCELLED",
        },
      },
      orderBy: [
        { startTime: "asc" },
        { id: "asc" },
      ],
      select: {
        id: true,
        appointmentNumber: true,
        userId: true,
        serviceId: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });

    const myAppointments = appointments.filter(
      (appointment) => appointment.userId === userId
    );

    const queue = myAppointments.map((appointment) => {
      const position =
        appointments.findIndex(
          (item) => item.id === appointment.id
        ) + 1;

      return {
        appointmentId: appointment.id,
        appointmentNumber: appointment.appointmentNumber,
        serviceId: appointment.serviceId,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        queuePosition: position,
      };
    });

    return res.status(200).json({
      success: true,
      queue,
    });
  } catch (error) {
    console.error("GET MY QUEUE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Could not fetch queue position",
    });
  }
};

// GET /api/queue
// GET /api/queue?branchId=1&date=2026-09-24
export const getBranchQueue = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      res.status(403).json({
        success: false,
        message: "Only staff or admins can view the branch queue",
      });
      return;
    }

    const parsed = queueQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "branchId and date are required",
      });
      return;
    }

    const { branchId, date } = parsed.data;

    const queueDate = new Date(`${date}T00:00:00.000Z`);

    const queue = await prisma.queue.findMany({
      where: {
        branchId,
        queueDate,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        appointment: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                duration: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          priority: "desc",
        },
        {
          position: "asc",
        },
      ],
    });

    res.status(200).json({
      success: true,
      count: queue.length,
      queue,
    });
  } catch (error) {
    console.error("GET BRANCH QUEUE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Could not fetch branch queue",
    });
  }
};

// PATCH /api/queue/:queueId/start
export const startQueueService = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (req.user.role !== "STAFF" && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only staff or admin can start a service",
      });
    }

    const queueId = Number(req.params.queueId);

    if (!Number.isInteger(queueId) || queueId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid queue ID",
      });
    }

    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        appointment: true,
      },
    });

    if (!queue) {
      return res.status(404).json({
        success: false,
        message: "Queue entry not found",
      });
    }

    if (queue.status !== "CALLED") {
      return res.status(400).json({
        success: false,
        message: "Only a called customer can start service",
      });
    }

    const updatedQueue = await prisma.$transaction(async (tx) => {
      const updated = await tx.queue.update({
        where: { id: queueId },
        data: {
          status: "IN_PROGRESS",
        },
        include: {
          appointment: true,
        },
      });

      await tx.appointment.update({
        where: { id: queue.appointmentId },
        data: {
          status: "IN_PROGRESS",
        },
      });

      return updated;
    });

    return res.status(200).json({
      success: true,
      data: {
        queueId: updatedQueue.id,
        appointmentId: updatedQueue.appointmentId,
        appointmentNumber: updatedQueue.appointment.appointmentNumber,
        status: updatedQueue.status,
      },
      message: "Service started",
    });
  } catch (error) {
    console.error("Start service error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to start service",
    });
  }
};

// PATCH /api/queue/:queueId/complete
export const completeQueueService = async (
  req: AuthRequest,
  res: Response
)  => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (req.user.role !== "STAFF" && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only staff or admin can complete a service",
      });
    }

    const queueId = Number(req.params.queueId);

    if (!Number.isInteger(queueId) || queueId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid queue ID",
      });
    }

    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        appointment: true,
      },
    });

    if (!queue) {
      return res.status(404).json({
        success: false,
        message: "Queue entry not found",
      });
    }

    if (queue.status !== "IN_PROGRESS") {
      return res.status(400).json({
        success: false,
        message: "Only an in-progress service can be completed",
      });
    }

    const updatedQueue = await prisma.$transaction(async (tx) => {
      const updated = await tx.queue.update({
        where: { id: queueId },
        data: {
          status: "COMPLETED",
        },
        include: {
          appointment: true,
        },
      });

      await tx.appointment.update({
        where: { id: queue.appointmentId },
        data: {
          status: "COMPLETED",
        },
      });

      return updated;
    });

    return res.status(200).json({
      success: true,
      data: {
        queueId: updatedQueue.id,
        appointmentId: updatedQueue.appointmentId,
        appointmentNumber: updatedQueue.appointment.appointmentNumber,
        status: updatedQueue.status,
      },
      message: "Service completed",
    });
  } catch (error) {
    console.error("Complete service error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to complete service",
    });
  }
};
// PATCH /api/queue/:queueId/skip
export const skipQueueCustomer = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (req.user.role !== "STAFF" && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only staff or admin can skip a customer",
      });
    }

    const queueId = Number(req.params.queueId);

    if (!Number.isInteger(queueId) || queueId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid queue ID",
      });
    }

    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        appointment: true,
      },
    });

    if (!queue) {
      return res.status(404).json({
        success: false,
        message: "Queue entry not found",
      });
    }

    if (queue.status !== "CALLED") {
      return res.status(400).json({
        success: false,
        message: "Only a called customer can be skipped",
      });
    }

    const updatedQueue = await prisma.$transaction(async (tx) => {
      const updated = await tx.queue.update({
        where: { id: queueId },
        data: {
          status: "SKIPPED",
        },
        include: {
          appointment: true,
        },
      });

      await tx.appointment.update({
        where: { id: queue.appointmentId },
        data: {
          status: "NO_SHOW",
        },
      });

      return updated;
    });

    return res.status(200).json({
      success: true,
      data: {
        queueId: updatedQueue.id,
        appointmentId: updatedQueue.appointmentId,
        appointmentNumber: updatedQueue.appointment.appointmentNumber,
        status: updatedQueue.status,
      },
      message: "Customer skipped",
    });
  } catch (error) {
    console.error("Skip customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to skip customer",
    });
  }
};

// PATCH /api/queue/:queueId/cancel
export const cancelQueueEntry = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (req.user.role !== "STAFF" && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only staff or admin can cancel a queue entry",
      });
    }

    const queueId = Number(req.params.queueId);

    if (!Number.isInteger(queueId) || queueId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid queue ID",
      });
    }

    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        appointment: true,
      },
    });

    if (!queue) {
      return res.status(404).json({
        success: false,
        message: "Queue entry not found",
      });
    }

    if (
      queue.status === "COMPLETED" ||
      queue.status === "CANCELLED" ||
      queue.status === "SKIPPED"
    ) {
      return res.status(400).json({
        success: false,
        message: "This queue entry cannot be cancelled",
      });
    }

    const updatedQueue = await prisma.$transaction(async (tx) => {
      const updated = await tx.queue.update({
        where: { id: queueId },
        data: {
          status: "CANCELLED",
        },
        include: {
          appointment: true,
        },
      });

      await tx.appointment.update({
        where: { id: queue.appointmentId },
        data: {
          status: "CANCELLED",
        },
      });

      return updated;
    });

    return res.status(200).json({
      success: true,
      data: {
        queueId: updatedQueue.id,
        appointmentId: updatedQueue.appointmentId,
        appointmentNumber: updatedQueue.appointment.appointmentNumber,
        status: updatedQueue.status,
      },
      message: "Queue entry cancelled",
    });
  } catch (error) {
    console.error("Cancel queue error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel queue entry",
    });
  }
};