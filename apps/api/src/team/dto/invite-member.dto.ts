import { IsEmail, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteMemberDto {
  @ApiProperty({
    example: 'newmember@example.com',
    description: 'Email address of the person to invite',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'STAFF',
    description: 'Role to assign to the invited member',
    enum: ['ADMIN', 'STAFF'],
  })
  @IsIn(['ADMIN', 'STAFF'])
  role!: 'ADMIN' | 'STAFF';
}
