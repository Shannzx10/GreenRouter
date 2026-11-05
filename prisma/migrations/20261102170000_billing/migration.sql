-- Plan langganan + cerminan keadaan langganan Paddle pada User.
ALTER TABLE "User" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'gratis';
ALTER TABLE "User" ADD COLUMN "paddleCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN "paddleSubscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN "paddleSubStatus" TEXT;
ALTER TABLE "User" ADD COLUMN "paddleLastEventAt" TIMESTAMP(3);
