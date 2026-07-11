import type { ReactNode } from "react";

import { requireAdminSession } from "../../../modules/auth/public";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireAdminSession();

  return <>{children}</>;
}
