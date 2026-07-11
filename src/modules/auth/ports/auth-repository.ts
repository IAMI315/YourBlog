export interface AuthRepository {
  getAdmin(): Promise<{ id: string; passwordHash: string } | null>;
  countRecentFailures(ipHash: string, since: Date): Promise<number>;
  recordFailure(ipHash: string, occurredAt: Date): Promise<void>;
  createSession(input: {
    adminId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findSession(tokenHash: string): Promise<{ adminId: string; expiresAt: Date } | null>;
}

export interface AdminPasswordRepository {
  resetAdminPasswordHash(passwordHash: string, changedAt: Date): Promise<void>;
}
