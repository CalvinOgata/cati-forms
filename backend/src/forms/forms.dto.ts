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

// DTOs verificam apenas o formato do body da requisição
// as regras dos formulários estão em FormsService

export class CreateQuestionDto {
  @IsIn(QUESTION_TYPES, { message: 'Tipo de pergunta inválido.' })
  type: QuestionType;

  @IsString()
  @MaxLength(500, { message: 'A pergunta pode ter até 500 caracteres.' })
  title: string;

  // quantidade ilimitada de opções marcaveis (RF05), ignorada para perguntas de texto
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, {
    each: true,
    message: 'Cada opção pode ter até 200 caracteres.',
  })
  options: string[];
}

// Body de POST /api/forms
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

// Body de POST /api/public/forms/:id/responses
export class SubmitResponseDto {
  // requerido apenas se o formulário pergunta por isso (RN08)
  @IsOptional()
  @IsString()
  @MaxLength(254)
  email?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}

// query de GET /api/forms/:id/export.csv e .pdf (RN11), respostas mais antigas primeiro
export class ExportQueryDto implements ResponseQuery {
  @IsOptional()
  @IsIn(RESPONSE_ORDERS, { message: 'Ordem inválida.' })
  order?: ResponseOrder;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'A busca pode ter até 200 caracteres.' })
  q?: string;

  // filtro para respostas que escolheram uma certa opção numa pergunta
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsString()
  option?: string;
}
