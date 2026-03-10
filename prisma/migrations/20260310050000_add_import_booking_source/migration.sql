-- AlterEnum: Add IMPORT to BookingSource
ALTER TYPE "BookingSource" ADD VALUE IF NOT EXISTS 'IMPORT';
