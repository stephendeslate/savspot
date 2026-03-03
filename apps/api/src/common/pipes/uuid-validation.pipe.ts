import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';

/**
 * UUID v4 format regex.
 * Matches: xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx
 */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Custom pipe that validates a value is a valid UUID v4 string.
 *
 * Usage:
 *   @Get(':id')
 *   findOne(@Param('id', UuidValidationPipe) id: string) { ... }
 */
@Injectable()
export class UuidValidationPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !UUID_V4_REGEX.test(value)) {
      throw new BadRequestException(
        `"${value}" is not a valid UUID v4`,
      );
    }
    return value;
  }
}
