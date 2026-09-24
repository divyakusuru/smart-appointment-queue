import { Response } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../config/prisma";
import { reservationQueue } from "../services/reservation.queue";
const reservationSchema = z.object({
  branchId: z.coerce.number().int().positive(),
  serviceId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
});

function dateFromString(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(
    2,
    "0"
  )}`;
}

function isValidDate(date: string): boolean {
  const parsed = new Date(`${date}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

function overlaps(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && endA > startB;
}

export async function createReservation(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Login required",
        },
      });
    }

    const parsed = reservationSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid reservation data",
        },
      });
    }

    const { branchId, serviceId, date, startTime } = parsed.data;

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_DATE",
          message: "Invalid date",
        },
      });
    }

    const appointmentDate = dateFromString(date);
    const startMinutes = timeToMinutes(startTime);

    if (
      startMinutes < 0 ||
      startMinutes >= 24 * 60 ||
      startMinutes % 15 !== 0
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TIME",
          message: "Start time must be a valid 15-minute slot",
        },
      });
    }

    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        branchId,
        active: true,
        branch: {
          active: true,
        },
      },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        error: {
          code: "INVALID_SERVICE",
          message: "Service not found or inactive",
        },
      });
    }

    const endMinutes = startMinutes + service.duration;

    if (endMinutes > 24 * 60) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TIME",
          message: "Appointment ends outside the day",
        },
      });
    }

    const startDateTime = new Date(
      `${date}T${startTime}:00.000Z`
    );

    const endDateTime = new Date(
      `${date}T${minutesToTime(endMinutes)}:00.000Z`
    );

    const reservation = await prisma.$transaction(
      async (tx) => {
        const lockKey = `${branchId}:${serviceId}:${date}`;

        await tx.$executeRaw`
          SELECT pg_advisory_xact_lock(
            hashtext(${lockKey})
          )
        `;

        const now = new Date();

        // Expire old reservations for this slot.
        await tx.reservation.updateMany({
          where: {
            branchId,
            serviceId,
            reservedDate: appointmentDate,
            status: "ACTIVE",
            expiresAt: {
              lte: now,
            },
          },
          data: {
            status: "EXPIRED",
          },
        });

        // Check existing appointments.
        const appointments = await tx.appointment.findMany({
          where: {
            branchId,
            serviceId,
            appointmentDate,
            status: {
              in: [
                "PENDING",
                "CONFIRMED",
                "CHECKED_IN",
                "IN_PROGRESS",
              ],
            },
          },
          select: {
            startTime: true,
            endTime: true,
          },
        });

        const appointmentConflict = appointments.some((appointment) =>
          overlaps(
            startMinutes,
            endMinutes,
            appointment.startTime.getUTCHours() * 60 +
              appointment.startTime.getUTCMinutes(),
            appointment.endTime.getUTCHours() * 60 +
              appointment.endTime.getUTCMinutes()
          )
        );

        if (appointmentConflict) {
          throw new Error("SLOT_UNAVAILABLE");
        }

        // Check active reservations.
        const reservations = await tx.reservation.findMany({
          where: {
            branchId,
            serviceId,
            reservedDate: appointmentDate,
            status: "ACTIVE",
            expiresAt: {
              gt: now,
            },
          },
        });

        const reservationConflict = reservations.some((reservation) =>
          overlaps(
            startMinutes,
            endMinutes,
            reservation.startTime.getUTCHours() * 60 +
              reservation.startTime.getUTCMinutes(),
            reservation.endTime.getUTCHours() * 60 +
              reservation.endTime.getUTCMinutes()
          )
        );

        if (reservationConflict) {
          throw new Error("SLOT_RESERVED");
        }

        const expiresAt = new Date(
          Date.now() + 5 * 60 * 1000
        );

        return tx.reservation.create({
          data: {
            token: randomUUID(),
            userId: req.user!.id,
            branchId,
            serviceId,
            reservedDate: appointmentDate,
            startTime: startDateTime,
            endTime: endDateTime,
            expiresAt,
            status: "ACTIVE",
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );
     await reservationQueue.add(
  "expire-reservation",
  {
    reservationId: reservation.id,
  },
  {
    delay: Math.max(
      0,
      reservation.expiresAt.getTime() - Date.now()
    ),
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  }
);
    return res.status(201).json({
      success: true,
      data: {
        reservationId: reservation.id,
        reservationToken: reservation.token,
        expiresAt: reservation.expiresAt,
        expiresInSeconds: Math.max(
          0,
          Math.floor(
            (reservation.expiresAt.getTime() - Date.now()) / 1000
          )
        ),
      },
      message: "Slot reserved for 5 minutes",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SLOT_UNAVAILABLE") {
        return res.status(409).json({
          success: false,
          error: {
            code: "SLOT_UNAVAILABLE",
            message: "This slot is already booked",
          },
        });
      }

      if (error.message === "SLOT_RESERVED") {
        return res.status(409).json({
          success: false,
          error: {
            code: "SLOT_RESERVED",
            message: "This slot is temporarily reserved by another customer",
          },
        });
      }
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not reserve slot",
      },
    });
  }
}


export async function getMyReservations(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Login required",
        },
      });
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        branch: true,
        service: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      success: true,
      data: reservations,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not retrieve reservations",
      },
    });
  }
}
export async function cancelReservation(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Login required",
        },
      });
    }

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid reservation ID",
        },
      });
    }

    const reservation = await prisma.reservation.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Reservation not found",
        },
      });
    }

    if (reservation.status !== "ACTIVE") {
      return res.status(409).json({
        success: false,
        error: {
          code: "INVALID_STATUS",
          message: "Reservation is no longer active",
        },
      });
    }

    const updated = await prisma.reservation.update({
      where: {
        id,
      },
      data: {
        status: "CANCELLED",
      },
    });

    return res.json({
      success: true,
      data: updated,
      message: "Reservation cancelled",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not cancel reservation",
      },
    });
  }
}