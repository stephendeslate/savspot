import { IsString, Matches } from 'class-validator';

export class AddDomainDto {
  @IsString()
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/, {
    message: 'Invalid domain format. Example: book.mybusiness.com',
  })
  domain!: string;
}
