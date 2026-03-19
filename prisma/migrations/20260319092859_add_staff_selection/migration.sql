-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "staff_id" TEXT;

-- AlterTable
ALTER TABLE "date_reservations" ADD COLUMN     "staff_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "title" VARCHAR(100);

-- CreateIndex
CREATE INDEX "bookings_staff_id_idx" ON "bookings"("staff_id");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
