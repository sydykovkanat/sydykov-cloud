import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import { MediaService } from './media.service.js';

@Controller('media')
export class MediaController {
  public constructor(private readonly mediaService: MediaService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  public async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'File is required'
      };
    }

    const media = await this.mediaService.upload(file);

    return {
      id: media.id,
      filename: media.filename,
      mimeType: media.mimeType,
      size: media.size,
      createdAt: media.createdAt
    };
  }

  @Get()
  public async findAll() {
    const mediaList = await this.mediaService.findAllPublic();

    return mediaList.map((media) => ({
      id: media.id,
      filename: media.filename,
      mimeType: media.mimeType,
      size: media.size,
      createdAt: media.createdAt
    }));
  }

  @Get(':id')
  public async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response
  ) {
    const media = await this.mediaService.findById(id);

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    const stream = await this.mediaService.getFileStream(media.objectKey);

    res.set({
      'Content-Type': media.mimeType,
      'Content-Disposition': `inline; filename="${media.filename}"`,
      'Cache-Control': 'private, max-age=31536000'
    });

    stream.pipe(res);
  }
}
