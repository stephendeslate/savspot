import { IsEnum, IsOptional, IsNumber } from 'class-validator';
import { PartnerStatus } from '../../../../../prisma/generated/prisma';

const UPDATABLE_STATUSES = [
  PartnerStatus.APPROVED,
  PartnerStatus.SUSPENDED,
  PartnerStatus.TERMINATED,
] as const;

export class UpdatePartnerDto {
  @IsEnum(UPDATABLE_STATUSES)
  @IsOptional()
  status?: (typeof UPDATABLE_STATUSES)[number];

  @IsNumber()
  @IsOptional()
  commissionRate?: number;
}
