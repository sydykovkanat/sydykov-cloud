import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { MinioModule } from './infrastructure/minio/minio.module.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { MediaModule } from './media/media.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    MinioModule,
    MediaModule
  ]
})
export class AppModule {}
