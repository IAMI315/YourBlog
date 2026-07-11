-- CreateTable
CREATE TABLE "LoginFailure" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginFailure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginFailure_ipHash_occurredAt_idx" ON "LoginFailure"("ipHash", "occurredAt");
