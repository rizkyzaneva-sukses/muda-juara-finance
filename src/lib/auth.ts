import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'mudajuara_secret'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'mudajuara2026'

export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD
}

export function generateToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  const cookieToken = req.cookies.get('admin_token')?.value
  return cookieToken || null
}

export function isAdminRequest(req: NextRequest): boolean {
  const token = getTokenFromRequest(req)
  if (!token) return false
  const payload = verifyToken(token)
  return payload?.role === 'admin'
}
