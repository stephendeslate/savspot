import { Module } from '@nestjs/common';
import { OnboardingToursController } from './onboarding-tours.controller';
import { OnboardingToursService } from './onboarding-tours.service';

@Module({
  controllers: [OnboardingToursController],
  providers: [OnboardingToursService],
  exports: [OnboardingToursService],
})
export class OnboardingToursModule {}
