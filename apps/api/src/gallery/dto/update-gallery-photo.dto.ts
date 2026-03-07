import { PartialType } from '@nestjs/swagger';
import { CreateGalleryPhotoDto } from './create-gallery-photo.dto';

export class UpdateGalleryPhotoDto extends PartialType(CreateGalleryPhotoDto) {}
