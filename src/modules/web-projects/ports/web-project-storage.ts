import type { ValidatedUpload } from "../domain/web-project";

export interface WebProjectStorage {
  stage(token: string, entries: ValidatedUpload["entries"]): Promise<string>;
  publish(stagingPrefix: string, projectSlug: string, version: number): Promise<string>;
  activate(projectSlug: string, versionPrefix: string): Promise<void>;
  remove(prefix: string): Promise<void>;
}
