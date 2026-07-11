import type {
  WebProjectAdminSummary,
  WebProjectPublicSummary,
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
  findById(id: string): Promise<WebProjectRecord | null>;
  findBySlug(slug: string): Promise<WebProjectRecord | null>;
  createDraft(input: CreateWebProjectInput): Promise<WebProjectRecord>;
  addVersion(input: CreateWebProjectVersionInput): Promise<WebProjectVersionRecord>;
  setCurrentVersion(input: {
    projectId: string;
    versionId: string;
    stableUrl: string;
    publishedAt: Date;
  }): Promise<void>;
  currentVersion(projectId: string): Promise<WebProjectVersionRecord | null>;
  listVersions(projectId: string): Promise<WebProjectVersionRecord[]>;
  removeVersion(versionId: string): Promise<void>;
  listForAdmin(): Promise<WebProjectAdminSummary[]>;
  listPublished(): Promise<WebProjectPublicSummary[]>;
}
