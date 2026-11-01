import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SubmitResponseDto } from './forms.dto.js';
import { FormsService } from './forms.service.js';
import type { Form, FormResponse } from './forms.types.js';

/** Routes behind a form's link: no login needed (RF09, RN09). */
@Controller('public/forms')
export class PublicFormsController {
  constructor(private readonly forms: FormsService) {}

  /** GET /api/public/forms/:id: the form to answer, without its responses. */
  @Get(':id')
  get(@Param('id') id: string): Form {
    return this.forms.publicForm(id);
  }

  /** POST /api/public/forms/:id/responses: 400 if any question is unanswered. */
  @Post(':id/responses')
  submit(
    @Param('id') id: string,
    @Body() body: SubmitResponseDto,
  ): Pick<FormResponse, 'id' | 'submittedAt'> {
    return this.forms.submit(id, body);
  }
}
