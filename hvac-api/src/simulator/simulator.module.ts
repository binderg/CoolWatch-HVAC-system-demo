import { Global, Module } from '@nestjs/common'
import { TelemetryModule } from '../telemetry/telemetry.module'
import { SimulatorService } from './simulator.service'

// @Global so every feature module can inject SimulatorService
// without needing to import SimulatorModule themselves.
@Global()
@Module({
  imports: [TelemetryModule],
  providers: [SimulatorService],
  exports: [SimulatorService],
})
export class SimulatorModule {}
