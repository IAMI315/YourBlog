import { createHmac, timingSafeEqual } from "node:crypto";

import { AppError } from "../../../infrastructure/errors/app-error";
import type { StagedProject, UploadKind, ValidatedUpload } from "../domain/web-project";

export type StagedUploadTicket = {
  staged: {
    prefix: string;
    manifestPath: string;
    checksum: string;
    fileCount: number;
    extractedBytes: number;
    createdAt: string;
  };
  validation: {
    kind: UploadKind;
    checksum: string;
    compressedBytes: number;
    extractedBytes: number;
    fileCount: number;
  };
};

export function createStagedUploadTicket(
  secret: string,
  input: { staged: StagedProject; validated: ValidatedUpload },
): string {
  const ticket: StagedUploadTicket = {
    staged: {
      prefix: input.staged.prefix,
      manifestPath: input.staged.manifestPath,
      checksum: input.staged.checksum,
      fileCount: input.staged.fileCount,
      extractedBytes: input.staged.extractedBytes,
      createdAt: input.staged.createdAt.toISOString(),
    },
    validation: {
      kind: input.validated.kind,
      checksum: input.validated.checksum,
      compressedBytes: input.validated.compressedBytes,
      extractedBytes: input.validated.extractedBytes,
      fileCount: input.validated.fileCount,
    },
  };
  const payload = Buffer.from(JSON.stringify(ticket), "utf8").toString("base64url");

  return `${payload}.${signature(secret, payload)}`;
}

export function verifyStagedUploadTicket(secret: string, ticket: string): {
  staged: StagedProject;
  validated: ValidatedUpload;
} {
  const [payload, mac] = ticket.split(".");

  if (!payload || !mac || !safeEqual(signature(secret, payload), mac)) {
    throw new AppError("WEB_PROJECT_INVALID_UPLOAD_TICKET", 400, "The upload session is invalid or expired.");
  }

  const parsed = parseTicket(payload);

  return {
    staged: {
      prefix: parsed.staged.prefix,
      manifestPath: parsed.staged.manifestPath,
      checksum: parsed.staged.checksum,
      fileCount: parsed.staged.fileCount,
      extractedBytes: parsed.staged.extractedBytes,
      createdAt: new Date(parsed.staged.createdAt),
    },
    validated: {
      kind: parsed.validation.kind,
      checksum: parsed.validation.checksum,
      compressedBytes: parsed.validation.compressedBytes,
      extractedBytes: parsed.validation.extractedBytes,
      fileCount: parsed.validation.fileCount,
      entries: [],
    },
  };
}

function parseTicket(payload: string): StagedUploadTicket {
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as StagedUploadTicket;
  } catch (error) {
    throw new AppError("WEB_PROJECT_INVALID_UPLOAD_TICKET", 400, "The upload session is invalid or expired.", {
      cause: error,
    });
  }
}

function signature(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.byteLength === rightBuffer.byteLength && timingSafeEqual(leftBuffer, rightBuffer);
}
