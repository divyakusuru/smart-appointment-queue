import { prisma } from "../config/prisma";

export async function getBranches() {
  return prisma.branch.findMany({
    orderBy: { id: "asc" },
  });
}

export async function createBranch(data: {
  name: string;
  address: string;
  contact?: string;
}) {
  return prisma.branch.create({
    data,
  });
}

export async function updateBranch(
  id: number,
  data: {
    name?: string;
    address?: string;
    contact?: string;
    active?: boolean;
  }
) {
  return prisma.branch.update({
    where: { id },
    data,
  });
}

export async function deactivateBranch(id: number) {
  return prisma.branch.update({
    where: { id },
    data: { active: false },
  });
}