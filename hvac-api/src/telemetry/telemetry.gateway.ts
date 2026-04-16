import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server } from 'socket.io'

@WebSocketGateway({ cors: { origin: '*' } })
export class TelemetryGateway {
  @WebSocketServer()
  server: Server

  broadcast(event: string, data: unknown): void {
    this.server.emit(event, data)
  }
}
