-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authProviders" TEXT NOT NULL DEFAULT 'password',
ADD COLUMN     "image" TEXT;
