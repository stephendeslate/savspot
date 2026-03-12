import { IsUUID, IsBoolean, IsOptional } from 'class-validator';

export class AssignStaffDto {
  @IsUUID()
  userId!: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
