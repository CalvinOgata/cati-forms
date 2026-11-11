import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  RESPONSE_ORDERS,
  type ResponseOrder,
  type ResponseQuery,
} from './forms.organize.js';
import { QUESTION_TYPES, type QuestionType } from './forms.types.js';

// The DTOs only check the shape of the body. The form rules (required fields,
// options, answers matching the questions) are in FormsService, where the
// messages can say which question is wrong.

export class CreateQuestionDto {
  @IsIn(QUESTION_TYPES, { message: 'Tipo de pergunta inválido.' })
  type: QuestionType;

  @IsString()
  @MaxLength(500, { message: 'A pergunta pode ter até 500 caracteres.' })
  title: string;

  /** No limit on how many (RF05). Ignored for text questions. */
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, {
    each: true,
    message: 'Cada opção pode ter até 200 caracteres.',
  })
  options: string[];
}

/** Body of POST /api/forms. */
export class CreateFormDto {
  @IsString()
  @MaxLength(200, { message: 'O título pode ter até 200 caracteres.' })
  title: string;

  @IsString()
  @MaxLength(2000, { message: 'A descrição pode ter até 2000 caracteres.' })
  description: string;

  @IsBoolean()
  collectEmail: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}

export class AnswerDto {
  @IsString()
  questionId: string;

  @IsArray()
  @IsString({ each: true })
  choices: string[];

  @IsString()
  @MaxLength(10000, { message: 'Cada resposta pode ter até 10000 caracteres.' })
  text: string;
}

/** Body of POST /api/public/forms/:id/responses. */
export class SubmitResponseDto {
  /** Required only when the form asks for it (RN08). */
  @IsOptional()
  @IsString()
  @MaxLength(254)
  email?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}

/**
 * Query of GET /api/forms/:id/export.csv and .pdf: how to organize the
 * responses (RN11). Without it, every response, oldest first.
 */
export class ExportQueryDto implements ResponseQuery {
  @IsOptional()
  @IsIn(RESPONSE_ORDERS, { message: 'Ordem inválida.' })
  order?: ResponseOrder;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'A busca pode ter até 200 caracteres.' })
  q?: string;

  /** With `option`: only the responses that chose it in this question. */
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsString()
  option?: string;
}
