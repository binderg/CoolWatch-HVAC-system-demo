import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Allow the React dev server (Vite default: 5173) to reach the API
  app.enableCors({ origin: ['http://localhost:5173', 'http://localhost:3000'] })

  await app.listen(process.env.PORT ?? 3001)
  console.log(`API running on http://localhost:${process.env.PORT ?? 3001}`)
}
bootstrap()
