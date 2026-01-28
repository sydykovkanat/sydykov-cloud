import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { MediaModel } from 'generated/prisma/models.js';
import type { Readable } from 'stream';

import { MinioService } from '../infrastructure/minio/minio.service.js';
import { PrismaService } from '../infrastructure/prisma/prisma.service.js';

@Injectable()
export class MediaService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService
  ) {}

  public async upload(file: Express.Multer.File): Promise<MediaModel> {
    const objectKey = this.generateObjectKey(file.originalname);

    await this.minioService.uploadFile(
      objectKey,
      file.buffer,
      file.size,
      file.mimetype
    );

    const media = await this.prisma.media.create({
      data: {
        objectKey,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        isPublic: true
      }
    });

    return media;
  }

  public async findAllPublic(): Promise<MediaModel[]> {
    return this.prisma.media.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  public async findById(id: string): Promise<MediaModel | null> {
    return this.prisma.media.findUnique({
      where: { id }
    });
  }

  public async getFileStream(objectKey: string): Promise<Readable> {
    return this.minioService.getFileStream(objectKey);
  }

  public async delete(id: string): Promise<void> {
    const media = await this.prisma.media.findUnique({
      where: { id }
    });

    if (media) {
      await this.minioService.deleteFile(media.objectKey);
      await this.prisma.media.delete({ where: { id } });
    }
  }

  private generateObjectKey(originalFilename: string): string {
    const uuid = randomUUID();
    const extension = this.getFileExtension(originalFilename);

    return extension ? `${uuid}.${extension}` : uuid;
  }

  private getFileExtension(filename: string): string | null {
    const lastDot = filename.lastIndexOf('.');

    if (lastDot === -1 || lastDot === filename.length - 1) {
      return null;
    }

    return filename.slice(lastDot + 1).toLowerCase();
  }
}
