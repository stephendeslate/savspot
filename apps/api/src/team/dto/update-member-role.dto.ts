import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberRoleDto {
  @ApiProperty({
    example: 'ADMIN',
    description: 'New role for the team member',
    enum: ['OWNER', 'ADMIN', 'STAFF'],
  })
  @IsIn(['OWNER', 'ADMIN', 'STAFF'])
  role!: 'OWNER' | 'ADMIN' | 'STAFF';
}
