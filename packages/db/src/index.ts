import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";

export { auroraProject } from "./seed-data/projects-aurora";
export { validationProjectsPart1 } from "./seed-data/projects-validation-1";
export { validationProjectsPart2 } from "./seed-data/projects-validation-2";
export type { ProjectFixture } from "./seed-data/types";
