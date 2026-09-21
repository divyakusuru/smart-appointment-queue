
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
} from "../utils/tokens";

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export async function registerUser(data: RegisterInput) {
  const email = data.email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: data.name.trim(),
      email,
      passwordHash,
      role: "CUSTOMER",
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function loginUser(emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);

  if (!validPassword) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const accessToken = createAccessToken(user.id, user.role);
  const refreshToken = createRefreshToken(user.id);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt,
    },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
}