import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { FormsController } from './forms.controller.js';
import { FormsRepository } from './forms.repository.js';
import { FormsService } from './forms.service.js';
import { PublicFormsController } from './public-forms.controller.js';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [FormsController, PublicFormsController],
  providers: [FormsService, FormsRepository],
})
export class FormsModule {}
