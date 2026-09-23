
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
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
    const { branchId, serviceId, requestedDate, requestedTime } = req.body;

    if (!userId) {
      res.status(401).json({ message: "Please login first" });
      return;
    }

    if (!branchId || !serviceId || !requestedDate) {
      res.status(400).json({
        message: "branchId, serviceId and requestedDate are required",
      });
      return;
    }

    const date = new Date(requestedDate);

    if (Number.isNaN(date.getTime())) {
      res.status(400).json({ message: "Invalid requestedDate" });
      return;
    }

    // Normalize to a date-only value
    date.setUTCHours(0, 0, 0, 0);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (date < today) {
      res.status(400).json({
        message: "Requested date cannot be in the past",
      });
      return;
    }

    const branch = await prisma.branch.findUnique({
      where: { id: Number(branchId) },
    });

    if (!branch || !branch.active) {
      res.status(404).json({
        message: "Branch not found or inactive",
      });
      return;
    }

    const service = await prisma.service.findUnique({
      where: { id: Number(serviceId) },
    });

    if (
      !service ||
      !service.active ||
      service.branchId !== Number(branchId)
    ) {
      res.status(400).json({
        message: "Invalid service for this branch",
      });
      return;
    }

    const entry = await prisma.waitlist.create({
      data: {
        userId,
        branchId: Number(branchId),
        serviceId: Number(serviceId),
        requestedDate: date,
        requestedTime: requestedTime || null,
      },
    });

    res.status(201).json({
      message: "Successfully joined the waitlist",
      waitlist: entry,
    });
  } catch (error) {
    console.error("Join waitlist error:", error);
    res.status(500).json({
      message: "Failed to join waitlist",
    });
  }
};

// GET /api/waitlist/mine
// Customer views their own waitlist entries
export const getMyWaitlist = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Please login first" });
      return;
    }

    const entries = await prisma.waitlist.findMany({
      where: { userId },
      include: {
        branch: true,
        service: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      count: entries.length,
      waitlist: entries,
    });
  } catch (error) {
    console.error("Get waitlist error:", error);
    res.status(500).json({
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
      res.status(401).json({ message: "Please login first" });
      return;
    }

    if (!Number.isInteger(entryId) || entryId <= 0) {
      res.status(400).json({ message: "Invalid waitlist ID" });
      return;
    }

    const entry = await prisma.waitlist.findUnique({
      where: { id: entryId },
    });

    if (!entry || entry.userId !== userId) {
      res.status(404).json({
        message: "Waitlist entry not found",
      });
      return;
    }

    if (entry.status !== "WAITING") {
      res.status(400).json({
        message: "Only waiting entries can be cancelled",
      });
      return;
    }

    const updatedEntry = await prisma.waitlist.update({
      where: { id: entryId },
      data: { status: "CANCELLED" },
    });

    res.status(200).json({
      message: "You have left the waitlist",
      waitlist: updatedEntry,
    });
  } catch (error) {
    console.error("Leave waitlist error:", error);
    res.status(500).json({
      message: "Failed to leave waitlist",
    });
  }
};