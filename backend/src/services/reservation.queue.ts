import { Queue } from "bullmq";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redisConnection = {
  url: redisUrl,
};

export const reservationQueue = new Queue("reservation-expiry", {
  connection: redisConnection,
});