import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignProviderDto {
  @ApiProperty({ description: 'UUID of the user to assign as provider' })
  @IsUUID()
  userId!: string;
}
