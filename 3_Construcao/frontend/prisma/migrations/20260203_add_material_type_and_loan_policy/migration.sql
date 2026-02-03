-- CreateEnum: MaterialType
CREATE TYPE "MaterialType" AS ENUM ('BOOK', 'DAILY_LOAN', 'REFERENCE', 'CD_DVD', 'MAGAZINE', 'THESIS');

-- CreateEnum: LoanPolicy
CREATE TYPE "LoanPolicy" AS ENUM ('STANDARD', 'DAILY', 'SHORT_TERM', 'NO_LOAN', 'EXTENDED');

-- AlterTable: Add materialType and loanPolicy to Book
ALTER TABLE "Book" ADD COLUMN "materialType" "MaterialType" NOT NULL DEFAULT 'BOOK';
ALTER TABLE "Book" ADD COLUMN "loanPolicy" "LoanPolicy" NOT NULL DEFAULT 'STANDARD';

-- CreateIndex (optional but recommended for performance)
CREATE INDEX "Book_materialType_idx" ON "Book"("materialType");
CREATE INDEX "Book_loanPolicy_idx" ON "Book"("loanPolicy");
