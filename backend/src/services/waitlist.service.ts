import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { randomUUID } from "crypto";
import { reservationQueue } from "./reservation.queue";

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToDate(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setUTCHours(
    Math.floor(minutes / 60),
    minutes % 60,
    0,
    0
  );
  return result;
}

export async function processWaitlistForSlot(
  appointment: {
    branchId: number;
    serviceId: number;
    appointmentDate: Date;
    startTime: Date;
    endTime: Date;
  }
) {
  const requestedDate = new Date(appointment.appointmentDate);
  requestedDate.setUTCHours(0, 0, 0, 0);

  const slotStartMinutes =
    appointment.startTime.getUTCHours() * 60 +
    appointment.startTime.getUTCMinutes();

  const slotEndMinutes =
    appointment.endTime.getUTCHours() * 60 +
    appointment.endTime.getUTCMinutes();

  /*
   * Find waiting customers for this branch,
   * service and date.
   *
   * requestedTime is optional, so customers
   * without a specific time are also eligible.
   */
  const candidates = await prisma.waitlist.findMany({
    where: {
      branchId: appointment.branchId,
      serviceId: appointment.serviceId,
      requestedDate,
      status: "WAITING",
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  for (const candidate of candidates) {
    /*
     * If the customer requested a specific time,
     * it must match the cancelled slot.
     */
    if (candidate.requestedTime) {
      const requestedMinutes = timeToMinutes(
        candidate.requestedTime
      );

      if (
        requestedMinutes < slotStartMinutes ||
        requestedMinutes >= slotEndMinutes
      ) {
        continue;
      }
    }

    try {
      const reservation = await prisma.$transaction(
        async (tx) => {
          /*
           * Lock this branch/service/date combination
           * so two cancellations cannot offer the same
           * slot simultaneously.
           */
          await tx.$executeRaw(
            Prisma.sql`
              SELECT pg_advisory_xact_lock(
                ${appointment.branchId},
                ${appointment.serviceId}
              )
            `
          );

          const current = await tx.waitlist.findUnique({
            where: {
              id: candidate.id,
            },
          });

          if (!current || current.status !== "WAITING") {
            return null;
          }

          const now = new Date();

          const existingAppointments =
            await tx.appointment.findMany({
              where: {
                branchId: appointment.branchId,
                serviceId: appointment.serviceId,
                appointmentDate: requestedDate,
                status: {
                  in: [
                    "PENDING",
                    "CONFIRMED",
                    "CHECKED_IN",
                    "IN_PROGRESS",
                  ],
                },
              },
            });

          const conflict = existingAppointments.some(
            (existing) =>
              existing.startTime < appointment.endTime &&
              existing.endTime > appointment.startTime
          );

          if (conflict) {
            return null;
          }

          const activeReservations =
            await tx.reservation.findMany({
              where: {
                branchId: appointment.branchId,
                serviceId: appointment.serviceId,
                reservedDate: requestedDate,
                status: "ACTIVE",
                expiresAt: {
                  gt: now,
                },
              },
            });

          const reservationConflict =
            activeReservations.some(
              (reservation) =>
                reservation.startTime <
                  appointment.endTime &&
                reservation.endTime >
                  appointment.startTime
            );

          if (reservationConflict) {
            return null;
          }

          const expiresAt = new Date(
            Date.now() + 5 * 60 * 1000
          );

          const newReservation =
            await tx.reservation.create({
              data: {
                token: randomUUID(),
                userId: current.userId,
                branchId: current.branchId,
                serviceId: current.serviceId,
                reservedDate: requestedDate,
                startTime: appointment.startTime,
                endTime: appointment.endTime,
                expiresAt,
                status: "ACTIVE",
              },
            });

          await tx.waitlist.update({
            where: {
              id: current.id,
            },
            data: {
              status: "OFFERED",
            },
          });

          return newReservation;
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        }
      );

      if (!reservation) {
        continue;
      }

      /*
       * Schedule automatic reservation expiry.
       */
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

      console.log(
        `Waitlist offer created for user ${candidate.userId}, ` +
        `waitlist ${candidate.id}, reservation ${reservation.id}`
      );

      /*
       * Important:
       * We offer only ONE customer for this newly
       * available slot.
       */
      return {
        waitlistId: candidate.id,
        userId: candidate.userId,
        reservationId: reservation.id,
        reservationToken: reservation.token,
        expiresAt: reservation.expiresAt,
      };
    } catch (error) {
      console.error(
        "WAITLIST PROCESSING ERROR:",
        error
      );

      continue;
    }
  }

  return null;
}