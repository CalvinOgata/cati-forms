import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

// Body do POST /api/auth/signup: as regras para novas contas ficam aqui
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

  // OBS: a senha ser igual a confirmação é verificado no frontend (signup/+page.svelte)
  @IsString({ message: 'Informe a senha.' })
  @Length(6, 128, { message: 'A senha deve ter entre 6 e 128 caracteres.' })
  password: string;
}

// Body do POST /api/auth/login, mais simple que o de Signup para não complicar processos de migration e mudança de regras de negócio
export class LoginDto {
  @IsString({ message: 'Informe o nome de usuário.' })
  @IsNotEmpty({ message: 'Informe o nome de usuário.' })
  username: string;

  @IsString({ message: 'Informe a senha.' })
  @IsNotEmpty({ message: 'Informe a senha.' })
  password: string;
}
