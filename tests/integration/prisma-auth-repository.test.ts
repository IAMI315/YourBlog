import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaAuthRepository } from "../../src/modules/auth/adapters/prisma-auth-repository";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("PrismaAuthRepository", () => {
  const prisma = databaseUrl
    ? new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
    : null;

  beforeEach(async () => {
    await prisma?.loginFailure.deleteMany();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("persists only an IP hash and counts failures in the requested window", async () => {
    if (!prisma) throw new Error("DATABASE_URL is required");
    const repository = new PrismaAuthRepository(prisma);
    const ipHash = "8f46f5eb6d7487332ce6ab63b3cf57df6bb37645c783559153008c11cc228c44";

    await repository.recordFailure(ipHash, new Date("2026-07-11T07:44:59.999Z"));
    await repository.recordFailure(ipHash, new Date("2026-07-11T07:45:00.000Z"));
    await repository.recordFailure(ipHash, new Date("2026-07-11T07:59:00.000Z"));

    await expect(
      repository.countRecentFailures(ipHash, new Date("2026-07-11T07:45:00.000Z")),
    ).resolves.toBe(2);
    const rows = await prisma.loginFailure.findMany();
    expect(rows).toHaveLength(3);
    expect(Object.keys(rows[0] ?? {})).toEqual(["id", "ipHash", "occurredAt"]);
  });
});
