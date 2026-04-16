import { Module } from '@nestjs/common'
import { AlertsModule } from './alerts/alerts.module'
import { DevicesModule } from './devices/devices.module'
import { SimulatorModule } from './simulator/simulator.module'
import { SitesModule } from './sites/sites.module'
import { TelemetryModule } from './telemetry/telemetry.module'

@Module({
  imports: [
    TelemetryModule,    // gateway — must be first so SimulatorModule can inject it
    SimulatorModule,    // @Global — seeds devices, starts tick loop
    DevicesModule,
    AlertsModule,
    SitesModule,
  ],
})
export class AppModule {}
