
import jwt from "jsonwebtoken";
import crypto from "crypto";

const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

if (!accessSecret || !refreshSecret) {
  throw new Error("JWT secrets are missing from environment variables");
}

export function createAccessToken(userId: number, role: string) {
  return jwt.sign(
    { userId, role },
    accessSecret!,
    { expiresIn: "15m" }
  );
}

export function createRefreshToken(userId: number) {
  return jwt.sign(
    { userId },
    refreshSecret!,
    { expiresIn: "7d" }
  );
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, accessSecret!);
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, refreshSecret!);
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}