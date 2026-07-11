import type {
  ValidatedUpload,
  WebProjectRecord,
  WebProjectVersionRecord,
} from "../domain/web-project";

export type CreateWebProjectInput = {
  title: string;
  slug: string;
  summary?: string;
};

export type CreateWebProjectVersionInput = {
  projectId: string;
  version: number;
  storagePrefix: string;
  validation: ValidatedUpload;
};

export interface WebProjectRepository {
  findBySlug(slug: string): Promise<WebProjectRecord | null>;
  create(input: CreateWebProjectInput): Promise<WebProjectRecord>;
  createVersion(input: CreateWebProjectVersionInput): Promise<WebProjectVersionRecord>;
}
