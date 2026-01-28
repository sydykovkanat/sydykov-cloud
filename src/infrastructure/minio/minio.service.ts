import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import type { Readable } from 'stream';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Minio.Client;
  private readonly bucket: string;

  public constructor(private readonly configService: ConfigService) {
    this.client = new Minio.Client({
      endPoint: this.configService.getOrThrow<string>('MINIO_ENDPOINT'),
      port: Number(this.configService.getOrThrow<string>('MINIO_PORT')),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: this.configService.getOrThrow<string>('MINIO_SECRET_KEY')
    });

    this.bucket = this.configService.getOrThrow<string>('MINIO_BUCKET');
  }

  public async onModuleInit(): Promise<void> {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);

    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Bucket "${this.bucket}" created`);
    } else {
      this.logger.log(`Bucket "${this.bucket}" already exists`);
    }
  }

  public async uploadFile(
    objectKey: string,
    buffer: Buffer,
    size: number,
    mimeType: string
  ): Promise<void> {
    await this.client.putObject(this.bucket, objectKey, buffer, size, {
      'Content-Type': mimeType
    });

    this.logger.debug(`Uploaded file: ${objectKey}`);
  }

  public async getFileStream(objectKey: string): Promise<Readable> {
    return this.client.getObject(this.bucket, objectKey);
  }

  public async deleteFile(objectKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectKey);
    this.logger.debug(`Deleted file: ${objectKey}`);
  }

  public async getFileStat(
    objectKey: string
  ): Promise<Minio.BucketItemStat | null> {
    try {
      return await this.client.statObject(this.bucket, objectKey);
    } catch {
      return null;
    }
  }
}
