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

export {
  AccessMethod,
  Prisma,
  PrismaClient,
  ActionKind,
  AnalystState,
  Confidence,
  EntityKind,
  EntityRelationship,
  ProjectStage,
  SignalFamily,
  SourceCadence,
  SourceStatus,
} from "@prisma/client";

export type { RawDocument } from "@prisma/client";

export {
  auroraProject,
  projects as seededProjects,
  validationProjectsPart1,
  validationProjectsPart2,
} from "./seed-data";
export type { ProjectFixture } from "./seed-data/types";
