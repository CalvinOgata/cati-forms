import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthenticatedRequest } from '../auth/session.js';
import { responsesCsv } from './forms.csv.js';
import { CreateFormDto, ExportQueryDto } from './forms.dto.js';
import { exportFileName } from './forms.export.js';
import { responseView } from './forms.organize.js';
import { responsesPdf } from './forms.pdf.js';
import { FormsService } from './forms.service.js';
import type { Form, FormDetail, FormSummary } from './forms.types.js';

/**
 * Routes for logged-in users (RN03). There are deliberately no edit or delete
 * routes: forms can't change after they're created (RN07).
 */
@Controller('forms')
@UseGuards(AuthGuard)
export class FormsController {
  constructor(private readonly forms: FormsService) {}

  /** GET /api/forms: every form, newest first. */
  @Get()
  list(): Promise<FormSummary[]> {
    return this.forms.list();
  }

  /** GET /api/forms/:id: the form with its responses. 404 if it doesn't exist. */
  @Get(':id')
  detail(@Param('id') id: string): Promise<FormDetail> {
    return this.forms.detail(id);
  }

  /**
   * GET /api/forms/:id/export.csv: the responses as a spreadsheet (RF15),
   * organized as the query asks (RN11, see ExportQueryDto).
   */
  @Get(':id/export.csv')
  @Header('Cache-Control', 'no-store')
  async exportCsv(
    @Param('id') id: string,
    @Query() query: ExportQueryDto,
  ): Promise<StreamableFile> {
    const form = await this.forms.detail(id);
    const view = responseView(form, query);
    return new StreamableFile(Buffer.from(responsesCsv(form, view)), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="${exportFileName(form, 'csv')}"`,
    });
  }

  /** GET /api/forms/:id/export.pdf: the same, as a document (RF16). */
  @Get(':id/export.pdf')
  @Header('Cache-Control', 'no-store')
  async exportPdf(
    @Param('id') id: string,
    @Query() query: ExportQueryDto,
  ): Promise<StreamableFile> {
    const form = await this.forms.detail(id);
    const view = responseView(form, query);
    return new StreamableFile(await responsesPdf(form, view), {
      type: 'application/pdf',
      disposition: `attachment; filename="${exportFileName(form, 'pdf')}"`,
    });
  }

  /** POST /api/forms: creates a form owned by the logged-in user. */
  @Post()
  create(
    @Body() body: CreateFormDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Form> {
    return this.forms.create(body, req.user.id);
  }
}
