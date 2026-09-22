
import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../config/prisma";
import { z } from "zod";

const queueQuerySchema = z.object({
  branchId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

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
export const getBranchQueue = async (
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

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      return res.status(403).json({
        success: false,
        message: "Only staff or admins can view the branch queue",
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

    const queue = appointments.map((appointment, index) => ({
      ...appointment,
      queuePosition: index + 1,
    }));

    return res.status(200).json({
      success: true,
      count: queue.length,
      queue,
    });
  } catch (error) {
    console.error("GET BRANCH QUEUE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Could not fetch branch queue",
    });
  }
};