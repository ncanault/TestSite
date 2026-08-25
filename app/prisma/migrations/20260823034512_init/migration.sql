-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PLAYER');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('NONE', 'BASIC', 'ALLIANCE', 'COMPETITIVE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'PENDING', 'ACTIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alliance" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serverId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Alliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PLAYER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allianceId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "allianceId" TEXT NOT NULL,
    "tier" "Tier" NOT NULL DEFAULT 'NONE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'NONE',
    "paypalRef" TEXT,
    "requestedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "activatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "gameId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "allianceId" TEXT NOT NULL,
    "keep" INTEGER NOT NULL,
    "power" DOUBLE PRECISION NOT NULL,
    "rally" DOUBLE PRECISION NOT NULL,
    "rein" DOUBLE PRECISION NOT NULL,
    "siege" INTEGER NOT NULL,
    "range" INTEGER NOT NULL,
    "cavs" INTEGER NOT NULL,
    "ground" INTEGER NOT NULL,
    "siegeAtk" INTEGER NOT NULL,
    "groundDef" INTEGER NOT NULL,
    "cavsHp" INTEGER NOT NULL,
    "archerDeb" INTEGER NOT NULL,
    "siegeAtkDeb" INTEGER NOT NULL,
    "siegeHpDeb" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("gameId")
);

-- CreateTable
CREATE TABLE "AccountHistory" (
    "id" TEXT NOT NULL,
    "accountGameId" BIGINT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keep" INTEGER NOT NULL,
    "power" DOUBLE PRECISION NOT NULL,
    "rally" DOUBLE PRECISION NOT NULL,
    "rein" DOUBLE PRECISION NOT NULL,
    "siege" INTEGER NOT NULL,
    "range" INTEGER NOT NULL,
    "cavs" INTEGER NOT NULL,
    "ground" INTEGER NOT NULL,
    "siegeAtk" INTEGER NOT NULL,
    "groundDef" INTEGER NOT NULL,
    "cavsHp" INTEGER NOT NULL,
    "archerDeb" INTEGER NOT NULL,
    "siegeAtkDeb" INTEGER NOT NULL,
    "siegeHpDeb" INTEGER NOT NULL,

    CONSTRAINT "AccountHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Server_number_key" ON "Server"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Alliance_serverId_tag_key" ON "Alliance"("serverId", "tag");

-- CreateIndex
CREATE UNIQUE INDEX "Alliance_serverId_name_key" ON "Alliance"("serverId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_allianceId_key" ON "Subscription"("allianceId");

-- CreateIndex
CREATE INDEX "Account_allianceId_idx" ON "Account"("allianceId");

-- CreateIndex
CREATE INDEX "AccountHistory_accountGameId_capturedAt_idx" ON "AccountHistory"("accountGameId", "capturedAt");

-- AddForeignKey
ALTER TABLE "Alliance" ADD CONSTRAINT "Alliance_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alliance" ADD CONSTRAINT "Alliance_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "Alliance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountHistory" ADD CONSTRAINT "AccountHistory_accountGameId_fkey" FOREIGN KEY ("accountGameId") REFERENCES "Account"("gameId") ON DELETE CASCADE ON UPDATE CASCADE;
