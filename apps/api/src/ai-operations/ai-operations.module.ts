import { Module } from '@nestjs/common';
import { AiOperationsController } from './ai-operations.controller';
import { AiOperationsService } from './ai-operations.service';

@Module({
  controllers: [AiOperationsController],
  providers: [AiOperationsService],
  exports: [AiOperationsService],
})
export class AiOperationsModule {}
