import crypto from 'crypto'

function getEncryptionKey() {
  const key = process.env.MFA_ENCRYPTION_KEY
  if (!key) {
    throw new Error('MFA_ENCRYPTION_KEY is not configured.')
  }

  const buffer = Buffer.from(key, key.length === 64 ? 'hex' : 'base64')
  if (buffer.length !== 32) {
    throw new Error('MFA_ENCRYPTION_KEY must resolve to 32 bytes for AES-256-GCM encryption.')
  }

  return buffer
}

export function encryptSecret(secret) {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    encryptedSecret: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  }
}

export function decryptSecret({ encryptedSecret, iv, authTag }) {
  if (!encryptedSecret || !iv || !authTag) {
    throw new Error('Encrypted secret is incomplete.')
  }

  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(authTag, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedSecret, 'base64')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}
