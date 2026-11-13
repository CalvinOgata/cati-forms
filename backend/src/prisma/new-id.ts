import { randomBytes } from 'node:crypto';

// função básica para gerar ids únicos para usuários, formulários, e outros objetos da aplicação (RF08)
export function newId(): string {
  return randomBytes(8).toString('base64url');
}
