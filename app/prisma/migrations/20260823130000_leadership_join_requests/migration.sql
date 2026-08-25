-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "userId" TEXT,
ALTER COLUMN "keep" SET DEFAULT 0,
ALTER COLUMN "power" SET DEFAULT 0,
ALTER COLUMN "rally" SET DEFAULT 0,
ALTER COLUMN "rein" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isLeadership" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pendingAllianceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Account_userId_key" ON "Account"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_pendingAllianceId_fkey" FOREIGN KEY ("pendingAllianceId") REFERENCES "Alliance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

