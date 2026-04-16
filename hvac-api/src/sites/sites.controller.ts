import { Controller, Get } from '@nestjs/common'
import { SimulatorService } from '../simulator/simulator.service'

@Controller('sites')
export class SitesController {
  constructor(private readonly simulator: SimulatorService) {}

  @Get()
  findAll() {
    return this.simulator.getSites()
  }
}
