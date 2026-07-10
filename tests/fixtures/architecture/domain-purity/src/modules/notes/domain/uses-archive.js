import { open } from "yauzl-promise";
import { ZipFile } from "yazl";

export const archiveReader = open;
export const archiveWriter = ZipFile;
