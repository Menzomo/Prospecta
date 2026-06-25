import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

function getMasterKey(): Buffer {
  const key = process.env.TELEPHONY_MASTER_KEY
  if (!key) throw new Error('TELEPHONY_MASTER_KEY is not configured')
  // Normalize to 32 bytes regardless of input length
  return createHash('sha256').update(key).digest()
}

export function encryptCredential(plaintext: string): string {
  const key = getMasterKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptCredential(ciphertext: string): string {
  const key = getMasterKey()
  const parts = ciphertext.split(':')
  if (parts.length !== 3) throw new Error('Invalid ciphertext format')
  const [ivHex, tagHex, encHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(encHex, 'hex')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
}
