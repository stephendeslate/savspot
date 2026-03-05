import { IsArray, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignServicesDto {
  @ApiProperty({
    example: ['uuid-1', 'uuid-2'],
    description: 'Service IDs to assign to the team member',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  serviceIds!: string[];
}
