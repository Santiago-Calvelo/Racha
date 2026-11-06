import { Global, Module } from '@nestjs/common';
import { PersonasModule } from '../personas/personas.module';
import { TokenService } from './token.service';
import { PersonaAuthService } from './persona-auth.service';
import { AuthController } from './auth.controller';
import { IndicesAuthService } from './indices-auth.service';
@Global()
@Module({
  imports: [PersonasModule], controllers: [AuthController],
  providers: [TokenService, PersonaAuthService, IndicesAuthService], exports: [TokenService, PersonaAuthService, IndicesAuthService],
})
export class AuthModule {}
