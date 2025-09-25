import { zxcvbn } from '@zxcvbn-ts/core'
import crypto from 'crypto'

const MIN_PASSWORD_LENGTH = 12
const MIN_ZXCVBN_SCORE = 3

export function validatePasswordStrength(password, { email = '', username = '' } = {}) {
  if (!password || typeof password !== 'string') {
    return { valid: false, reason: 'Password is required.' }
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      reason: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    }
  }

  const evaluation = zxcvbn(password, [email, username].filter(Boolean))
  if (evaluation.score < MIN_ZXCVBN_SCORE) {
    return {
      valid: false,
      reason: 'Password is too weak. Please add more complexity and avoid common patterns.',
      suggestions: evaluation.feedback?.suggestions || [],
    }
  }

  return { valid: true }
}

export async function checkPasswordPwned(password) {
  const sha1Hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase()
  const prefix = sha1Hash.slice(0, 5)
  const suffix = sha1Hash.slice(5)

  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent': 'TM-Project Security Audit',
      },
    })
    if (!response.ok) {
      console.warn('HIBP range API returned non-ok status:', response.status)
      return { pwned: false }
    }

    const body = await response.text()
    const lines = body.split('\n')

    for (const line of lines) {
      const [hashSuffix, count] = line.trim().split(':')
      if (hashSuffix === suffix) {
        return { pwned: true, count: parseInt(count, 10) }
      }
    }

    return { pwned: false }
  } catch (error) {
    console.error('Failed to query HaveIBeenPwned API:', error)
    return { pwned: false, error }
  }
}
