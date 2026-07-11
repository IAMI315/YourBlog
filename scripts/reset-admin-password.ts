import "dotenv/config";

import { prisma } from "../src/infrastructure/db/prisma";
import { resetAdminPasswordHash } from "../src/modules/auth/application/reset-admin-password";
import { PrismaAuthRepository } from "../src/modules/auth/adapters/prisma-auth-repository";

function readPasswordFromEnvironment(): string | null {
  return process.env.ADMIN_NEW_PASSWORD ?? null;
}

async function readHiddenPassword(prompt: string): Promise<string> {
  const stdin = process.stdin;
  const stdout = process.stdout;

  if (!stdin.isTTY || !stdout.isTTY || !stdin.setRawMode) {
    throw new Error("ADMIN_NEW_PASSWORD is required when no interactive TTY is available.");
  }

  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    let value = "";

    function cleanup() {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
    }

    function onData(chunk: string) {
      if (chunk === "\u0003") {
        cleanup();
        reject(new Error("Password reset cancelled."));
        return;
      }

      if (chunk === "\r" || chunk === "\n") {
        cleanup();
        stdout.write("\n");
        resolve(value);
        return;
      }

      if (chunk === "\b" || chunk === "\u007f") {
        value = value.slice(0, -1);
        return;
      }

      value += chunk;
    }

    stdin.on("data", onData);
  });
}

async function main() {
  const password =
    readPasswordFromEnvironment() ?? (await readHiddenPassword("New administrator password: "));
  const repository = new PrismaAuthRepository(prisma);
  const clock = { now: () => new Date() };

  await resetAdminPasswordHash({ repository, clock }, password);
  process.stdout.write("Administrator password reset. Existing sessions were revoked.\n");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown password reset failure.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
