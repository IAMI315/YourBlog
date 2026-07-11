import type { PrismaClient } from "../../../generated/prisma/client";
import type { AdminPasswordRepository, AuthRepository } from "../ports/auth-repository";

export class PrismaAuthRepository implements AuthRepository, AdminPasswordRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getAdmin() {
    return this.prisma.admin.findFirst({
      select: { id: true, passwordHash: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async countRecentFailures(ipHash: string, since: Date) {
    return this.prisma.loginFailure.count({
      where: { ipHash, occurredAt: { gte: since } },
    });
  }

  async recordFailure(ipHash: string, occurredAt: Date) {
    await this.prisma.loginFailure.create({ data: { ipHash, occurredAt } });
  }

  async createSession(input: { adminId: string; tokenHash: string; expiresAt: Date }) {
    await this.prisma.session.create({ data: input });
  }

  async findSession(tokenHash: string) {
    return this.prisma.session.findUnique({
      where: { tokenHash },
      select: { adminId: true, expiresAt: true },
    });
  }

  async resetAdminPasswordHash(passwordHash: string, changedAt: Date) {
    await this.prisma.$transaction(async (transaction) => {
      const admin = await transaction.admin.findFirst({ orderBy: { createdAt: "asc" } });

      if (admin) {
        await transaction.admin.update({
          where: { id: admin.id },
          data: { passwordHash, passwordChangedAt: changedAt },
        });
      } else {
        await transaction.admin.create({
          data: { passwordHash, passwordChangedAt: changedAt },
        });
      }

      await transaction.session.deleteMany();
    });
  }
}
