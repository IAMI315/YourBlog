export interface StoragePort {
  write(key: string, data: Uint8Array): Promise<void>;
  read(key: string): Promise<Uint8Array>;
  move(sourceKey: string, destinationKey: string): Promise<void>;
  removeTree(prefix: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
