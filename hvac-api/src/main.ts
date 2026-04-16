import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // ALLOWED_ORIGIN: set to your Azure Static Web Apps URL in production
  // e.g. https://my-app.azurestaticapps.net
  const allowedOrigins = process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(',')
    : ['http://localhost:5173', 'http://localhost:3000']

  app.enableCors({ origin: allowedOrigins })

  await app.listen(process.env.PORT ?? 3001)
  console.log(`API running on http://localhost:${process.env.PORT ?? 3001}`)
}
bootstrap()
