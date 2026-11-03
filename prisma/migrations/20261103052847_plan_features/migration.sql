-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "tokenLimit" INTEGER;

-- AlterTable
ALTER TABLE "ModelCatalog" ADD COLUMN     "earlyAccessUntil" TIMESTAMP(3);
