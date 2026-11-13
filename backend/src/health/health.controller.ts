import { Controller, Get } from '@nestjs/common';

// um controller simples para retornar se o servidor está saudável

export interface HealthStatus {
  status: 'ok';
  timestamp: string;
}

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthStatus {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
