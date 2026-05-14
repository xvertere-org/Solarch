import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { createHmac, createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

let SALT_ROUNDS = 12

/**
 * Set bcrypt work factor. Values above 12 cause noticeable event-loop blocking
 * (~1s at 13, ~2s at 14, ~4s at 15) which enables slow-loris DoS.
 * @throws if rounds outside [10, 12]
 */
// FIXED[M-2]: Clamped to [10, 12] to prevent DoS via excessive work factor
export function setBcryptRounds(rounds: number): void {
  if (rounds < 10 || rounds > 12) {
    throw new Error('Bcrypt rounds must be between 10 and 12')
  }
  SALT_ROUNDS = rounds
}

export function getBcryptRounds(): number {
  return SALT_ROUNDS
}

export async function hashPassword(password: string, rounds?: number): Promise<string> {
  return bcrypt.hash(password, rounds ?? SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateJWT(
  payload: { [key: string]: any },
  secret: string,
  expiration: string = '720h',
): string {
  return jwt.sign(payload, secret, { expiresIn: expiration } as jwt.SignOptions)
}

export function parseJWT(token: string, secret: string): { [key: string]: any } | null {
  try {
    return jwt.verify(token, secret) as Record<string, any>
  } catch {
    return null
  }
}

export function generateRandomString(length: number, chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'): string {
  // FIXED[L-3]: Rejection sampling to eliminate modulo bias
  const maxValid = 256 - (256 % chars.length)
  const result = new Array<string>(length)
  let generated = 0
  while (generated < length) {
    const bytes = randomBytes(length - generated)
    for (let i = 0; i < bytes.length && generated < length; i++) {
      if (bytes[i] < maxValid) {
        result[generated++] = chars[bytes[i] % chars.length]
      }
    }
  }
  return result.join('')
}

export function generateRandomStringByRegex(pattern: string): string {
  return pattern.replace(/\[([^\]]+)\]/g, (_, chars) => {
    if (chars === 'a-z') return generateRandomString(1, 'abcdefghijklmnopqrstuvwxyz')
    if (chars === 'A-Z') return generateRandomString(1, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    if (chars === '0-9') return generateRandomString(1, '0123456789')
    if (chars === 'a-zA-Z0-9') return generateRandomString(1, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
    return generateRandomString(1, chars)
  })
}

// FIXED[M-2]: Use random per-encryption salt instead of hardcoded/host-derived salt
const SALT_LENGTH = 16

export function encrypt(plaintext: string, secret: string): string {
  const salt = randomBytes(SALT_LENGTH)
  const key = scryptSync(secret, salt, 32)
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted
}

export function decrypt(ciphertext: string, secret: string): string {
  const parts = ciphertext.split(':')
  // Backward compat: old format is "iv:encrypted" (no salt), new format is "salt:iv:encrypted"
  if (parts.length < 3) {
    const ivHex = parts[0]
    const encrypted = parts.slice(1).join(':')
    const oldSalt = process.env.TSPOONBASE_ENCRYPTION_KEY || 'tspoonbase-enc-salt-v1'
    const key = scryptSync(secret, oldSalt, 32)
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }
  const salt = Buffer.from(parts[0], 'hex')
  const ivHex = parts[1]
  const encrypted = parts.slice(2).join(':')
  const key = scryptSync(secret, salt, 32)
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export function hmacSHA256(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex')
}

export function generateToken(length = 50): string {
  return randomBytes(length).toString('base64url')
}
