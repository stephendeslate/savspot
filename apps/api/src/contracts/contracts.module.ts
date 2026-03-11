import { Module } from '@nestjs/common';
import { ContractsController, ContractTemplatesController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  controllers: [ContractsController, ContractTemplatesController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
