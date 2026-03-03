import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      message: 'SavSpot API',
      version: '0.1.0',
    };
  }
}
