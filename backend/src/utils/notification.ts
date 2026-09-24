import { prisma } from "../config/prisma";

export const createNotification = async ({
  userId,
  type,
  title,
  message,
}: {
  userId: number;
  type: string;
  title: string;
  message: string;
}) => {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
      },
    });
  } catch (error) {
    // Notification failure should not break the main operation
    console.error("Notification error:", error);
    return null;
  }
};