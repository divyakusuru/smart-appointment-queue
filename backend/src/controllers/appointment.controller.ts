import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { randomUUID } from "crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

// ---------- VALIDATION ----------

const availabilitySchema = z.object({
  branchId: z.coerce.number().int().positive(),
  serviceId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const bookingSchema = availabilitySchema.extend({
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(500).optional(),
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

  const occupied = appointments.map((appointment) => ({
    start:
      appointment.startTime.getUTCHours() * 60 +
      appointment.startTime.getUTCMinutes(),
    end:
      appointment.endTime.getUTCHours() * 60 +
      appointment.endTime.getUTCMinutes(),
  }));

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

    // Capacity check based on overlapping appointments.
    const overlappingCount = occupied.filter((appointment) =>
      overlaps(start, end, appointment.start, appointment.end)
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

// ---------- 1. CHECK AVAILABILITY ----------

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
          message: "Provide valid branchId, serviceId and date",
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
      data: {
        branchId,
        serviceId,
        date,
        duration: result.service.duration,
        capacity: result.service.capacity,
        slots: result.slots,
        message: result.message,
      },
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

      if (error.message === "INVALID_BRANCH") {
        return res.status(404).json({
          success: false,
          error: {
            code: "INVALID_BRANCH",
            message: "Branch not found or inactive",
          },
        });
      }

      if (error.message === "INVALID_SERVICE") {
        return res.status(404).json({
          success: false,
          error: {
            code: "INVALID_SERVICE",
            message: "Service not found or inactive",
          },
        });
      }
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not check availability",
      },
    });
  }
}

// ---------- 2. BOOK APPOINTMENT ----------

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

    const { branchId, serviceId, date, startTime, notes } =
      parsed.data;

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

    // A unique idempotency key makes retries safe.
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

    // Return the original booking if the same user retries.
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
        // Serialize booking attempts for this branch/service/date.
        const lockKey = `${branchId}:${serviceId}:${date}`;

        // SELECT returns a row, so use $queryRaw.
       await tx.$executeRaw`
  SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint)
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

        // Recheck the slot while holding the lock.
        const availability = await getAvailableSlots(
          branchId,
          serviceId,
          date
        );

        if (!availability.slots.includes(startTime)) {
          throw new Error("SLOT_UNAVAILABLE");
        }

        const appointmentNumber =
          `SAQ-${Date.now()}-${randomUUID().slice(0, 8)}`;

        return tx.appointment.create({
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
    }

    // Prisma unique constraint conflict, such as a concurrent retry.
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

    console.error(error);

    console.error("BOOK APPOINTMENT ERROR:", error);

return res.status(500).json({
  success: false,
  error: {
    code: "INTERNAL_ERROR",
    message:
      error instanceof Error
        ? error.message
        : "Unknown booking error",
  },
});
  }
}

// ---------- 3. MY APPOINTMENTS ----------

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
    console.error(error);

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not retrieve appointments",
      },
    });
  }
}

// ---------- 4. CANCEL APPOINTMENT ----------

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
          code: "VALIDATION_ERROR",
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
      !["PENDING", "CONFIRMED"].includes(appointment.status)
    ) {
      return res.status(409).json({
        success: false,
        error: {
          code: "INVALID_STATUS",
          message: "This appointment cannot be cancelled now",
        },
      });
    }

    const updated = await prisma.appointment.update({
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
      message: "Appointment cancelled",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not cancel appointment",
      },
    });
  }
}

// ---------- 5. RESCHEDULE APPOINTMENT ----------

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

    const availability = await getAvailableSlots(
      current.branchId,
      current.serviceId,
      date
    );

    if (!availability.slots.includes(startTime)) {
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

    const updated = await prisma.appointment.update({
      where: {
        id,
      },
      data: {
        appointmentDate: dateFromString(date),
        startTime: new Date(
          `${date}T${startTime}:00.000Z`
        ),
        endTime: new Date(
          `${date}T${minutesToTime(endMinutes)}:00.000Z`
        ),
      },
    });

    return res.json({
      success: true,
      data: updated,
      message: "Appointment rescheduled",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Could not reschedule appointment",
      },
    });
  }
}