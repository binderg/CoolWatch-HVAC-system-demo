import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Request } from 'express'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>()
    const key = req.headers['x-api-key']
    const expected = process.env.API_KEY

    if (!expected) {
      // API_KEY not set — fail closed in all environments
      throw new UnauthorizedException('API key not configured on server')
    }

    if (key !== expected) {
      throw new UnauthorizedException('Invalid API key')
    }

    return true
  }
}
