import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import { generateAccessToken, generateRefreshToken } from '../../services/tokenService.ts'

const user = { userId: 'u1', username: 'ada', email: 'ada@example.com' }

describe('tokenService', () => {
  it('signs an access token with the expected claims', () => {
    const token = generateAccessToken(user)
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as jwt.JwtPayload
    expect(payload.userId).toBe('u1')
    expect(payload.username).toBe('ada')
    expect(payload.email).toBe('ada@example.com')
  })

  it('signs a refresh token with a different secret', () => {
    const token = generateRefreshToken(user)
    expect(() => jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string)).toThrow()
    const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET as string) as jwt.JwtPayload
    expect(payload.userId).toBe('u1')
  })
})
