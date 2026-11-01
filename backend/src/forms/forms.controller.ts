import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthenticatedRequest } from '../auth/session.js';
import { CreateFormDto } from './forms.dto.js';
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
  list(): FormSummary[] {
    return this.forms.list();
  }

  /** GET /api/forms/:id: the form with its responses. 404 if it doesn't exist. */
  @Get(':id')
  detail(@Param('id') id: string): FormDetail {
    return this.forms.detail(id);
  }

  /** POST /api/forms: creates a form owned by the logged-in user. */
  @Post()
  create(@Body() body: CreateFormDto, @Req() req: AuthenticatedRequest): Form {
    return this.forms.create(body, req.user.username);
  }
}
