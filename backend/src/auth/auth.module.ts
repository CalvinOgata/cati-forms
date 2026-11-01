import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  // Exported so other modules (e.g. forms) can protect their routes with AuthGuard.
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
