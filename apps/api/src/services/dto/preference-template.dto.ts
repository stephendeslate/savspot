import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetPreferenceTemplateDto {
  @ApiProperty({
    example: {
      fields: [
        { key: 'pressure', label: 'Massage Pressure', type: 'select', options: ['Light', 'Medium', 'Firm'] },
        { key: 'music', label: 'Music Preference', type: 'select', options: ['None', 'Ambient', 'Classical'] },
      ],
    },
    description: 'Preference template schema defining available fields and options',
  })
  @IsObject()
  template!: Record<string, unknown>;
}
