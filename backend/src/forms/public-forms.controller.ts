import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SubmitResponseDto } from './forms.dto.js';
import { FormsService } from './forms.service.js';
import type { Form, FormResponse } from './forms.types.js';

// rota para responder o formulário, sem necessidade de login (RF09, RN09)
@Controller('public/forms')
export class PublicFormsController {
  constructor(private readonly forms: FormsService) {}

  // GET /api/public/forms/:id: o formulário para responder, sem suas respostas
  @Get(':id')
  get(@Param('id') id: string): Promise<Form> {
    return this.forms.publicForm(id);
  }

  // POST /api/public/forms/:id/responses: erro 400 se qualquer pergunta não estiver respondida
  @Post(':id/responses')
  submit(
    @Param('id') id: string,
    @Body() body: SubmitResponseDto,
  ): Promise<Pick<FormResponse, 'id' | 'submittedAt'>> {
    return this.forms.submit(id, body);
  }
}
