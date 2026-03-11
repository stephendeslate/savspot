import { IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class BookingPermissionsDto {
  @IsOptional() @IsBoolean() view?: boolean;
  @IsOptional() @IsBoolean() create?: boolean;
  @IsOptional() @IsBoolean() edit?: boolean;
  @IsOptional() @IsBoolean() cancel?: boolean;
}

class ClientPermissionsDto {
  @IsOptional() @IsBoolean() view?: boolean;
  @IsOptional() @IsBoolean() edit?: boolean;
}

class ServicePermissionsDto {
  @IsOptional() @IsBoolean() manage?: boolean;
}

class PaymentPermissionsDto {
  @IsOptional() @IsBoolean() view?: boolean;
  @IsOptional() @IsBoolean() process?: boolean;
  @IsOptional() @IsBoolean() refund?: boolean;
}

class TeamPermissionsDto {
  @IsOptional() @IsBoolean() manage?: boolean;
}

class SettingsPermissionsDto {
  @IsOptional() @IsBoolean() manage?: boolean;
}

class ReportsPermissionsDto {
  @IsOptional() @IsBoolean() view?: boolean;
}

export class UpdatePermissionsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => BookingPermissionsDto)
  bookings?: BookingPermissionsDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ClientPermissionsDto)
  clients?: ClientPermissionsDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServicePermissionsDto)
  services?: ServicePermissionsDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentPermissionsDto)
  payments?: PaymentPermissionsDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TeamPermissionsDto)
  team?: TeamPermissionsDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => SettingsPermissionsDto)
  settings?: SettingsPermissionsDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReportsPermissionsDto)
  reports?: ReportsPermissionsDto;
}
