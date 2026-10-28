-- AlterTable
ALTER TABLE "ModelCatalog" ADD COLUMN     "capabilities" TEXT,
ADD COLUMN     "contextTokens" INTEGER,
ADD COLUMN     "inputModalities" TEXT,
ADD COLUMN     "knowledgeCutoff" TEXT,
ADD COLUMN     "maxOutputTokens" INTEGER;
