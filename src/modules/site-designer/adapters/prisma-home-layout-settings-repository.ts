import type { PrismaClient } from "../../../generated/prisma/client";
import {
  parseStoredHomeModules,
  type HomeLayoutSettings,
} from "../domain/home-layout";
import type { HomeLayoutSettingsRepository } from "../ports/home-layout-settings-repository";

type StoredHomeLayoutSettings = Omit<HomeLayoutSettings, "modules"> & {
  modules: unknown;
};

function toDomain(row: StoredHomeLayoutSettings): HomeLayoutSettings {
  return { ...row, modules: parseStoredHomeModules(row.modules) };
}

export class PrismaHomeLayoutSettingsRepository implements HomeLayoutSettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async get(): Promise<HomeLayoutSettings | null> {
    const settings = await this.prisma.homeLayoutSettings.findUnique({ where: { id: "home" } });

    return settings ? toDomain(settings) : null;
  }

  async save(settings: HomeLayoutSettings): Promise<HomeLayoutSettings> {
    const saved = await this.prisma.homeLayoutSettings.upsert({
      where: { id: "home" },
      create: { id: "home", ...settings, modules: settings.modules as never },
      update: { ...settings, modules: settings.modules as never },
    });

    return toDomain(saved);
  }
}
