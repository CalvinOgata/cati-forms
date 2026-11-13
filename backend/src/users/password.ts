import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

// retorna uma promise: recebe senha, o "salt" (pedaço de dados aleatórios), e tamanho da Hash
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keyLength: number,
) => Promise<Buffer>; // buffer da Promise

const SALT_BYTES = 16; // 'salt' de 16 bytes é um bom tamanho
const KEY_BYTES = 64; // chave de 64 bytes

// RNF05, fazendo um hash da senha com um salt para que a senha original não possa ser descoberta facilmente
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await scryptAsync(password, salt, KEY_BYTES);
  return `${salt.toString('hex')}:${hash.toString('hex')}`; // (salt:hash)
}

// verifica se a senha digitada em login bate com o hash guardado no banco de dados, sem saber a senha de verdade
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false; // senha não contém um dos dois, logo um erro

  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(
    password,
    Buffer.from(saltHex, 'hex'),
    expected.length,
  );
  // comparação de tempo constante para evitar 'timing attacks'
  return timingSafeEqual(actual, expected);
}
