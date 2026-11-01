import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FormsController } from './forms.controller.js';
import { FormsRepository } from './forms.repository.js';
import { FormsService } from './forms.service.js';
import { PublicFormsController } from './public-forms.controller.js';

@Module({
  // AuthModule provides AuthGuard for FormsController.
  imports: [AuthModule],
  controllers: [FormsController, PublicFormsController],
  providers: [FormsService, FormsRepository],
})
export class FormsModule {}
