import { SetMetadata } from '@nestjs/common';

export const ALLOW_DEMO_KEY = 'allowDemo';
export const AllowDemo = () => SetMetadata(ALLOW_DEMO_KEY, true);
