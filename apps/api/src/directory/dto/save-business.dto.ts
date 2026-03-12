import { IsUUID } from 'class-validator';

export class SaveBusinessDto {
  @IsUUID()
  tenantId!: string;
}
