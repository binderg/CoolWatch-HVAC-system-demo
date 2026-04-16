import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AlertsModule } from './alerts/alerts.module'
import { DevicesModule } from './devices/devices.module'
import { ApiKeyGuard } from './guards/api-key.guard'
import { SimulatorModule } from './simulator/simulator.module'
import { SitesModule } from './sites/sites.module'
import { TelemetryModule } from './telemetry/telemetry.module'

@Module({
  imports: [
    // Load .env file into process.env
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limit: max 60 requests per minute per IP
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    TelemetryModule,
    SimulatorModule,
    DevicesModule,
    AlertsModule,
    SitesModule,
  ],
  providers: [
    // Rate limiter applied globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // API key check applied globally
    { provide: APP_GUARD, useClass: ApiKeyGuard },
  ],
})
export class AppModule {}
