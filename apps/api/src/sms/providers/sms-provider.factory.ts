import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SMS_PROVIDER, SmsProvider } from './sms-provider.interface';
import { TwilioSmsProvider } from './twilio.provider';
import { PlivoSmsProvider } from './plivo.provider';

const logger = new Logger('SmsProviderFactory');

export function createSmsProvider(configService: ConfigService): SmsProvider {
  const providerName = configService
    .get<string>('SMS_PROVIDER', 'twilio')
    .toLowerCase();

  switch (providerName) {
    case 'plivo':
      logger.log('Using Plivo SMS provider');
      return new PlivoSmsProvider(configService);
    case 'twilio':
    default:
      logger.log('Using Twilio SMS provider');
      return new TwilioSmsProvider(configService);
  }
}

export const smsProviderFactory = {
  provide: SMS_PROVIDER,
  useFactory: createSmsProvider,
  inject: [ConfigService],
};
