import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common'
import { SimulatorService } from '../simulator/simulator.service'

@Controller('devices')
export class DevicesController {
  constructor(private readonly simulator: SimulatorService) {}

  @Get()
  findAll() {
    return this.simulator.getDevices()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const device = this.simulator.getDevice(id)
    if (!device) throw new NotFoundException(`Device ${id} not found`)
    return device
  }

  // GET /devices/:id/telemetry?window=30m
  // The `window` param is accepted for API compatibility with the real backend
  // contract; in-memory store always holds the last 30 points (~2.5 min).
  @Get(':id/telemetry')
  getTelemetry(@Param('id') id: string, @Query('window') _window?: string) {
    const device = this.simulator.getDevice(id)
    if (!device) throw new NotFoundException(`Device ${id} not found`)
    return this.simulator.getTelemetry(id)
  }
}
