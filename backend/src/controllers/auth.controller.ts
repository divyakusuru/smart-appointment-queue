
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import type { AuthRequest } from "../middleware/auth";

import {
  registerUser,
  loginUser,
} from "../services/auth.service";

import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  verifyRefreshToken,
} from "../utils/tokens";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(72),
});

// ---------------- REGISTER ----------------

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid registration data",
      },
    });
  }

  try {
    const user = await registerUser(parsed.data);

    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("REGISTER CONTROLLER ERROR:", error);

    if (
      error instanceof Error &&
      error.message === "EMAIL_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        success: false,
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          message: "Email is already registered",
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong",
      },
    });
  }
}

// ---------------- LOGIN ----------------

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid login data",
      },
    });
  }

  try {
    const result = await loginUser(
      parsed.data.email,
      parsed.data.password
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    // This prints the actual error in your backend terminal.
    console.error("LOGIN CONTROLLER ERROR:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Stack trace:", error.stack);
    }

    if (
      error instanceof Error &&
      error.message === "INVALID_CREDENTIALS"
    ) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong",
      },
    });
  }
}

// ---------------- REFRESH TOKEN ----------------

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;

  if (typeof refreshToken !== "string" || !refreshToken) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Refresh token required",
      },
    });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);

    if (
      typeof decoded === "string" ||
      typeof decoded.userId !== "number"
    ) {
      throw new Error("Invalid refresh token");
    }

    const tokenHash = hashToken(refreshToken);

    const session = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.userId !== decoded.userId
    ) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_REFRESH_TOKEN",
          message: "Refresh token is invalid or expired",
        },
      });
    }

    const newAccessToken = createAccessToken(
      session.user.id,
      session.user.role
    );

    const newRefreshToken = createRefreshToken(
      session.user.id
    );

    const newExpiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    await prisma.$transaction(async (tx) => {
      const result = await tx.refreshToken.updateMany({
        where: {
          id: session.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { revokedAt: new Date() },
      });

      if (result.count !== 1) {
        throw new Error("REFRESH_TOKEN_ALREADY_USED");
      }

      await tx.refreshToken.create({
        data: {
          tokenHash: hashToken(newRefreshToken),
          userId: session.user.id,
          expiresAt: newExpiresAt,
        },
      });
    });

    return res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error("REFRESH TOKEN ERROR:", error);

    if (
      error instanceof Error &&
      error.message === "REFRESH_TOKEN_ALREADY_USED"
    ) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_REFRESH_TOKEN",
          message: "Refresh token has already been used",
        },
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_REFRESH_TOKEN",
        message: "Refresh token is invalid or expired",
      },
    });
  }
}

// ---------------- LOGOUT ----------------

export async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body;

  if (typeof refreshToken === "string" && refreshToken) {
    await prisma.refreshToken.updateMany({
      where: {
        tokenHash: hashToken(refreshToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  return res.json({
    success: true,
    message: "Logged out successfully",
  });
}

// ---------------- CURRENT USER ----------------

export async function me(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "User not found",
      },
    });
  }

  return res.json({
    success: true,
    data: user,
  });
}