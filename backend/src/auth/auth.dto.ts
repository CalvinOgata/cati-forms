import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

/** Body of POST /api/auth/signup: the rules for new accounts live here. */
export class SignupDto {
  @IsString({ message: 'Informe o nome de usuário.' })
  @Length(3, 32, {
    message: 'O nome de usuário deve ter entre 3 e 32 caracteres.',
  })
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'O nome de usuário só pode ter letras, números, ponto, hífen e sublinhado.',
  })
  username: string;

  @IsString({ message: 'Informe a senha.' })
  @Length(6, 128, { message: 'A senha deve ter entre 6 e 128 caracteres.' })
  password: string;
}

/**
 * Body of POST /api/auth/login. Deliberately looser than SignupDto, so changing
 * the sign-up rules later never locks out existing accounts.
 */
export class LoginDto {
  @IsString({ message: 'Informe o nome de usuário.' })
  @IsNotEmpty({ message: 'Informe o nome de usuário.' })
  username: string;

  @IsString({ message: 'Informe a senha.' })
  @IsNotEmpty({ message: 'Informe a senha.' })
  password: string;
}
