import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { basename, extname } from 'path';
import { randomBytes } from 'crypto';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadsService } from './uploads.service';

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

@Controller('uploads')
export class UploadsController {
  constructor(private uploads: UploadsService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':noteId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          if (!ALLOWED_EXTENSIONS.has(ext)) {
            cb(new Error('Недопустимый тип файла'), '');
            return;
          }
          const unique = randomBytes(16).toString('hex');
          cb(null, `${unique}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (UploadsService.isAllowedImage(file.originalname, file.mimetype)) cb(null, true);
        else cb(new Error('Только PNG, JPEG, WebP и GIF'), false);
      },
    }),
  )
  upload(
    @Req() req: { user: { id: string } },
    @Param('noteId') noteId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploads.saveForNote(req.user.id, noteId, file);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('attachment/:id')
  remove(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.uploads.remove(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('attachment/:id/file')
  serveById(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.uploads.serveByAttachmentId(req.user.id, id, res);
  }

  @UseGuards(JwtAuthGuard)
  @Get('file/:filename')
  serve(
    @Req() req: { user: { id: string } },
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    return this.uploads.serveFile(req.user.id, basename(filename), res);
  }
}