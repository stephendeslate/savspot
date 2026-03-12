import { IsString, IsEnum, IsOptional, IsUrl } from 'class-validator';
import { PartnerType } from '../../../../../prisma/generated/prisma';

export class ApplyPartnerDto {
  @IsEnum(PartnerType)
  type!: PartnerType;

  @IsString()
  companyName!: string;

  @IsUrl()
  @IsOptional()
  companyUrl?: string;
}
