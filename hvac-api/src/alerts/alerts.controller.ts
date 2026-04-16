import { Controller, Get, NotFoundException, Param, Post } from '@nestjs/common'
import { SimulatorService } from '../simulator/simulator.service'

@Controller('alerts')
export class AlertsController {
  constructor(private readonly simulator: SimulatorService) {}

  @Get()
  findAll() {
    return this.simulator.getAlerts()
  }

  @Post(':id/acknowledge')
  acknowledge(@Param('id') id: string) {
    const removed = this.simulator.acknowledgeAlert(id)
    if (!removed) throw new NotFoundException(`Alert ${id} not found`)
    return { acknowledged: true }
  }
}
