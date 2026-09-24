import { Worker } from "bullmq";
import { prisma } from "../config/prisma";
import { processWaitlistForSlot } from "./waitlist.service";

const redisUrl =
  process.env.REDIS_URL || "redis://localhost:6379";

const redisConnection = {
  url: redisUrl,
};

export const reservationExpiryWorker = new Worker(
  "reservation-expiry",
  async (job) => {
    const { reservationId } = job.data;

    console.log(
      `Checking expiry for reservation ${reservationId}`
    );

    const reservation = await prisma.reservation.findUnique({
      where: {
        id: reservationId,
      },
    });

    if (!reservation) {
      console.log(
        `Reservation ${reservationId} not found`
      );
      return;
    }

    if (reservation.status !== "ACTIVE") {
      console.log(
        `Reservation ${reservationId} is already ${reservation.status}`
      );
      return;
    }

    if (reservation.expiresAt > new Date()) {
      console.log(
        `Reservation ${reservationId} has not expired yet`
      );
      return;
    }

    /*
     * 1. Expire the reservation.
     *
     * 2. If this reservation came from a waitlist offer,
     *    change that waitlist entry from OFFERED -> EXPIRED.
     */
    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: {
          id: reservationId,
        },
        data: {
          status: "EXPIRED",
        },
      });

      await tx.waitlist.updateMany({
        where: {
          userId: reservation.userId,
          branchId: reservation.branchId,
          serviceId: reservation.serviceId,
          requestedDate: reservation.reservedDate,
          status: "OFFERED",
        },
        data: {
          status: "EXPIRED",
        },
      });
    });

    console.log(
      `Reservation ${reservationId} expired successfully`
    );

    /*
     * Now that the slot is free again, try to offer it
     * to the next eligible customer in the waitlist.
     */
    const nextWaitlistOffer =
      await processWaitlistForSlot({
        branchId: reservation.branchId,
        serviceId: reservation.serviceId,
        appointmentDate: reservation.reservedDate,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
      });

    if (nextWaitlistOffer) {
      console.log(
        `Waitlist offer created: reservation ${nextWaitlistOffer.reservationId}`
      );
    } else {
      console.log(
        `No eligible waitlist customer found for reservation ${reservationId}`
      );
    }
  },
  {
    connection: redisConnection,
  }
);

reservationExpiryWorker.on("completed", (job) => {
  console.log(
    `Reservation expiry job ${job.id} completed`
  );
});

reservationExpiryWorker.on("failed", (job, error) => {
  console.error(
    `Reservation expiry job ${job?.id} failed:`,
    error
  );
});