
import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { randomUUID } from "crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { processWaitlistForSlot } from "../services/waitlist.service";

// ---------- VALIDATION ----------

const availabilitySchema = z.object({
  branchId: z.coerce.number().int().positive(),
  serviceId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const bookingSchema = availabilitySchema.extend({
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(500).optional(),

  // NEW: optional reservation token.
  // Booking without a reservation remains supported.
  reservationToken: z.string().uuid().optional(),
});

// ---------- HELPERS ----------

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

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
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

// ---------- AVAILABILITY LOGIC ----------

async function getAvailableSlots(
  branchId: number,
  serviceId: number,
  date: string
) {
  if (!isValidDate(date)) {
    throw new Error("INVALID_DATE");
  }

  const appointmentDate = dateFromString(date);

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
  });

  if (!branch || !branch.active) {
    throw new Error("INVALID_BRANCH");
  }

  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      branchId,
      active: true,
    },
  });

  if (!service) {
    throw new Error("INVALID_SERVICE");
  }

  // JavaScript: Sunday = 0, Monday = 1, ..., Saturday = 6
  const dayOfWeek = appointmentDate.getUTCDay();

  const holiday = await prisma.holiday.findUnique({
    where: {
      branchId_date: {
        branchId,
        date: appointmentDate,
      },
    },
  });

  if (holiday) {
    return {
      service,
      slots: [] as string[],
      message: "Branch is closed on this holiday",
    };
  }

  const hours = await prisma.businessHour.findUnique({
    where: {
      branchId_dayOfWeek: {
        branchId,
        dayOfWeek,
      },
    },
  });

  if (!hours) {
    return {
      service,
      slots: [] as string[],
      message: "No working hours configured",
    };
  }

  const open = timeToMinutes(hours.openTime);
  const close = timeToMinutes(hours.closeTime);
  const duration = service.duration;

  if (close <= open) {
    return {
      service,
      slots: [] as string[],
      message: "Invalid business hours",
    };
  }

  // Existing appointments occupying capacity.
  const appointments = await prisma.appointment.findMany({
    where: {
      branchId,
      serviceId,
      appointmentDate,
      status: {
        in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"],
      },
    },
    select: {
      startTime: true,
      endTime: true,
    },
  });

  const occupiedAppointments = appointments.map((appointment) => ({
    start:
      appointment.startTime.getUTCHours() * 60 +
      appointment.startTime.getUTCMinutes(),
    end:
      appointment.endTime.getUTCHours() * 60 +
      appointment.endTime.getUTCMinutes(),
  }));

  // NEW: active, unexpired reservations also occupy capacity.
  const reservations = await prisma.reservation.findMany({
    where: {
      branchId,
      serviceId,
      reservedDate: appointmentDate,
      status: "ACTIVE",
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      startTime: true,
      endTime: true,
    },
  });

  const occupiedReservations = reservations.map((reservation) => ({
    start:
      reservation.startTime.getUTCHours() * 60 +
      reservation.startTime.getUTCMinutes(),
    end:
      reservation.endTime.getUTCHours() * 60 +
      reservation.endTime.getUTCMinutes(),
  }));

  // Combine appointment and reservation occupancy.
  const occupied = [
    ...occupiedAppointments,
    ...occupiedReservations,
  ];

  const slots: string[] = [];

  // Generate slots at 15-minute intervals.
  for (
    let start = open;
    start + duration <= close;
    start += 15
  ) {
    const end = start + duration;

    // Exclude slots that overlap a configured break.
    if (hours.breakStart && hours.breakEnd) {
      const breakStart = timeToMinutes(hours.breakStart);
      const breakEnd = timeToMinutes(hours.breakEnd);

      if (overlaps(start, end, breakStart, breakEnd)) {
        continue;
      }
    }

    // Capacity check includes appointments and reservations.
    const overlappingCount = occupied.filter((item) =>
      overlaps(start, end, item.start, item.end)
    ).length;

    if (overlappingCount >= service.capacity) {
      continue;
    }

    slots.push(minutesToTime(start));
  }

  return {
    service,
    slots,
    message: "Available slots retrieved",
  };
}

export async function checkAvailability(
  req: AuthRequest,
  res: Response
) {
  try {
    const parsed = availabilitySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid branchId, serviceId, or date",
        },
      });
    }

    const { branchId, serviceId, date } = parsed.data;

    const result = await getAvailableSlots(
      branchId,
      serviceId,
      date
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_DATE") {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_DATE",
            message: "Invalid date",
          },
        });
      }

      if (
        error.message === "INVALID_BRANCH" ||
        error.message === "INVALID_SERVICE"
      ) {
        return res.status(404).json({
          success: false,
          error: {
            code: error.message,
            message: "Branch or service not found",
          },
        });
      }
    }

    console.error("CHECK AVAILABILITY ERROR:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not retrieve availability",
      },
    });
  }
}


export async function bookAppointment(
  req: AuthRequest,
  res: Response
) {
  try {
    const parsed = bookingSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid booking data",
        },
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Login required",
        },
      });
    }

    const userId = req.user.id;

    const {
      branchId,
      serviceId,
      date,
      startTime,
      notes,
      reservationToken,
    } = parsed.data;

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_DATE",
          message: "Invalid date",
        },
      });
    }

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

    const appointmentDate = dateFromString(date);

    const startDateTime = new Date(
      `${date}T${startTime}:00.000Z`
    );

    const endDateTime = new Date(
      `${date}T${minutesToTime(endMinutes)}:00.000Z`
    );

    // Require an idempotency key for safe retries.
    const idempotencyKey = req.get("Idempotency-Key");

    if (!idempotencyKey || idempotencyKey.length > 200) {
      return res.status(400).json({
        success: false,
        error: {
          code: "IDEMPOTENCY_KEY_REQUIRED",
          message: "Send an Idempotency-Key header",
        },
      });
    }

    // Return an existing booking if this is a retry.
    const existing = await prisma.appointment.findUnique({
      where: {
        idempotencyKey,
      },
    });

    if (existing) {
      if (existing.userId !== userId) {
        return res.status(409).json({
          success: false,
          error: {
            code: "IDEMPOTENCY_KEY_CONFLICT",
            message: "This key belongs to another user",
          },
        });
      }

      return res.json({
        success: true,
        data: existing,
        message: "Existing booking returned",
      });
    }

    const appointment = await prisma.$transaction(
      async (tx) => {
        // Serialize booking and reservation attempts
        // using the same branch/service/date lock.
        const lockKey = `${branchId}:${serviceId}:${date}`;

        await tx.$executeRaw`
  SELECT pg_advisory_xact_lock(
    hashtext(${lockKey})::bigint
  )
`;

        // Check idempotency again inside the transaction.
        const retry = await tx.appointment.findUnique({
          where: {
            idempotencyKey,
          },
        });

        if (retry) {
          if (retry.userId !== userId) {
            throw new Error("IDEMPOTENCY_CONFLICT");
          }

          return retry;
        }

        // Validate the reservation, if supplied.
        let reservation = null;

        if (reservationToken) {
          reservation = await tx.reservation.findUnique({
            where: {
              token: reservationToken,
            },
          });

          if (
            !reservation ||
            reservation.userId !== userId ||
            reservation.branchId !== branchId ||
            reservation.serviceId !== serviceId ||
            reservation.reservedDate.getTime() !==
              appointmentDate.getTime() ||
            reservation.status !== "ACTIVE" ||
            reservation.expiresAt <= new Date()
          ) {
            throw new Error("RESERVATION_INVALID");
          }

          const reservationStartMinutes =
            reservation.startTime.getUTCHours() * 60 +
            reservation.startTime.getUTCMinutes();

          if (reservationStartMinutes !== startMinutes) {
            throw new Error("RESERVATION_SLOT_MISMATCH");
          }
        }

        // Recheck availability while holding the lock.
        const availability = await getAvailableSlots(
          branchId,
          serviceId,
          date
        );

        // A valid reservation occupies capacity itself.
        // When booking with that reservation, allow its own
        // reserved slot even if the reservation fills capacity.
        if (!availability.slots.includes(startTime)) {
          if (!reservation) {
            throw new Error("SLOT_UNAVAILABLE");
          }

          // Recalculate availability excluding this reservation.
          const otherReservations =
            await tx.reservation.findMany({
              where: {
                branchId,
                serviceId,
                reservedDate: appointmentDate,
                status: "ACTIVE",
                expiresAt: {
                  gt: new Date(),
                },
                NOT: {
                  token: reservationToken,
                },
              },
              select: {
                startTime: true,
                endTime: true,
              },
            });

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

          const occupied = [
            ...appointments.map((item) => ({
              start:
                item.startTime.getUTCHours() * 60 +
                item.startTime.getUTCMinutes(),
              end:
                item.endTime.getUTCHours() * 60 +
                item.endTime.getUTCMinutes(),
            })),
            ...otherReservations.map((item) => ({
              start:
                item.startTime.getUTCHours() * 60 +
                item.startTime.getUTCMinutes(),
              end:
                item.endTime.getUTCHours() * 60 +
                item.endTime.getUTCMinutes(),
            })),
          ];

          const conflictingCount = occupied.filter((item) =>
            overlaps(
              startMinutes,
              endMinutes,
              item.start,
              item.end
            )
          ).length;

          if (conflictingCount >= service.capacity) {
            throw new Error("SLOT_UNAVAILABLE");
          }
        }

        const appointmentNumber =
          `SAQ-${Date.now()}-${randomUUID().slice(0, 8)}`;

        const createdAppointment = await tx.appointment.create({
          data: {
            appointmentNumber,
            userId,
            branchId,
            serviceId,
            appointmentDate,
            startTime: startDateTime,
            endTime: endDateTime,
            notes,
            idempotencyKey,
            status: "CONFIRMED",
          },
        });

        // Convert the reservation after successful creation.
        // Convert the reservation after successful creation.
if (reservation) {
  await tx.reservation.update({
    where: {
      id: reservation.id,
    },
    data: {
      status: "CONVERTED",
    },
  });

  // If this reservation came from a waitlist offer,
  // mark that waitlist entry as BOOKED.
  await tx.waitlist.updateMany({
    where: {
      userId,
      branchId,
      serviceId,
      requestedDate: appointmentDate,
      status: "OFFERED",
    },
    data: {
      status: "BOOKED",
    },
  });
}
        // Serialize queue-position allocation.
        const queueLockKey = `queue:${branchId}:${date}`;

        await tx.$executeRaw`
  SELECT pg_advisory_xact_lock(
    hashtext(${queueLockKey})::bigint
  )
`;

        const lastQueueEntry = await tx.queue.aggregate({
          where: {
            branchId,
            queueDate: appointmentDate,
          },
          _max: {
            position: true,
          },
        });

        const nextPosition =
          (lastQueueEntry._max.position ?? 0) + 1;

        await tx.queue.create({
          data: {
            appointmentId: createdAppointment.id,
            userId,
            branchId,
            queueDate: appointmentDate,
            position: nextPosition,
            priority: "NORMAL",
            status: "WAITING",
          },
        });

        return createdAppointment;
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return res.status(201).json({
      success: true,
      data: appointment,
      message: "Appointment booked successfully",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SLOT_UNAVAILABLE") {
        return res.status(409).json({
          success: false,
          error: {
            code: "SLOT_UNAVAILABLE",
            message: "This slot is no longer available",
          },
        });
      }

      if (error.message === "IDEMPOTENCY_CONFLICT") {
        return res.status(409).json({
          success: false,
          error: {
            code: "IDEMPOTENCY_KEY_CONFLICT",
            message: "This key belongs to another user",
          },
        });
      }

      if (error.message === "RESERVATION_INVALID") {
        return res.status(409).json({
          success: false,
          error: {
            code: "RESERVATION_INVALID",
            message:
              "Reservation is invalid, expired, or does not belong to you",
          },
        });
      }

      if (error.message === "RESERVATION_SLOT_MISMATCH") {
        return res.status(409).json({
          success: false,
          error: {
            code: "RESERVATION_SLOT_MISMATCH",
            message:
              "The selected time does not match the reservation",
          },
        });
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        success: false,
        error: {
          code: "BOOKING_CONFLICT",
          message: "Booking already exists; retry with the same key",
        },
      });
    }

    console.error("BOOK APPOINTMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not book appointment",
      },
    });
  }
}


export async function getMyAppointments(
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

    const appointments = await prisma.appointment.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        branch: true,
        service: true,
      },
      orderBy: [
        {
          appointmentDate: "desc",
        },
        {
          startTime: "desc",
        },
      ],
    });

    return res.json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    console.error("GET MY APPOINTMENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not retrieve appointments",
      },
    });
  }
}


export async function cancelAppointment(
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
          code: "INVALID_ID",
          message: "Invalid appointment ID",
        },
      });
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Appointment not found",
        },
      });
    }

    if (
      !["PENDING", "CONFIRMED"].includes(
        appointment.status
      )
    ) {
      return res.status(409).json({
        success: false,
        error: {
          code: "INVALID_STATUS",
          message: "This appointment cannot be cancelled",
        },
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.appointment.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      await tx.queue.updateMany({
        where: {
          appointmentId: id,
          status: {
            in: ["WAITING", "CALLED"],
          },
        },
        data: {
          status: "CANCELLED",
        },
      });

      return cancelled;
    });
    const waitlistOffer = await processWaitlistForSlot({
  branchId: updated.branchId,
  serviceId: updated.serviceId,
  appointmentDate: updated.appointmentDate,
  startTime: updated.startTime,
  endTime: updated.endTime,
});

   return res.json({
  success: true,
  data: updated,
  waitlistOffer,
  message: "Appointment cancelled",
});
  } catch (error) {
    console.error("CANCEL APPOINTMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not cancel appointment",
      },
    });
  }
}


export async function rescheduleAppointment(
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

    const parsed = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
      })
      .safeParse(req.body);

    const id = Number(req.params.id);

    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      !parsed.success ||
      !isValidDate(parsed.data.date)
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid appointment ID, date or time",
        },
      });
    }

    const current = await prisma.appointment.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!current) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Appointment not found",
        },
      });
    }

    if (
      !["PENDING", "CONFIRMED"].includes(current.status)
    ) {
      return res.status(409).json({
        success: false,
        error: {
          code: "INVALID_STATUS",
          message: "This appointment cannot be rescheduled",
        },
      });
    }

    const { date, startTime } = parsed.data;
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

    const appointmentDate = dateFromString(date);

    const availability = await getAvailableSlots(
      current.branchId,
      current.serviceId,
      date
    );

    // Exclude this appointment from occupancy when
    // rescheduling on the same date.
    const ownStart =
      current.startTime.getUTCHours() * 60 +
      current.startTime.getUTCMinutes();

    const ownEnd =
      current.endTime.getUTCHours() * 60 +
      current.endTime.getUTCMinutes();

    const isSameSlot =
      current.appointmentDate.getTime() ===
        appointmentDate.getTime() &&
      ownStart === startMinutes;

    if (
      !availability.slots.includes(startTime) &&
      !isSameSlot
    ) {
      return res.status(409).json({
        success: false,
        error: {
          code: "SLOT_UNAVAILABLE",
          message: "Requested slot is unavailable",
        },
      });
    }

    const endMinutes =
      startMinutes + availability.service.duration;

    if (endMinutes > 24 * 60) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TIME",
          message: "Appointment ends outside the day",
        },
      });
    }

    const updated = await prisma.$transaction(
      async (tx) => {
        const lockKey =
          `${current.branchId}:${current.serviceId}:${date}`;

        await tx.$executeRaw`
  SELECT pg_advisory_xact_lock(
    hashtext(${lockKey})::bigint
  )
`;

        // Recheck availability after obtaining the lock.
        const lockedAvailability = await getAvailableSlots(
          current.branchId,
          current.serviceId,
          date
        );

        if (
          !lockedAvailability.slots.includes(startTime) &&
          !isSameSlot
        ) {
          throw new Error("SLOT_UNAVAILABLE");
        }

        return tx.appointment.update({
          where: {
            id,
          },
          data: {
            appointmentDate,
            startTime: new Date(
              `${date}T${startTime}:00.000Z`
            ),
            endTime: new Date(
              `${date}T${minutesToTime(endMinutes)}:00.000Z`
            ),
          },
        });
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return res.json({
      success: true,
      data: updated,
      message: "Appointment rescheduled",
    });
  } catch (error) {
    if (error instanceof Error &&
        error.message === "SLOT_UNAVAILABLE") {
      return res.status(409).json({
        success: false,
        error: {
          code: "SLOT_UNAVAILABLE",
          message: "Requested slot is unavailable",
        },
      });
    }

    console.error("RESCHEDULE APPOINTMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not reschedule appointment",
      },
    });
  }
}