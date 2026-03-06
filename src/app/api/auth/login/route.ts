import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminPassword, generateToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  
  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: 'Password salah' }, { status: 401 })
  }

  const token = generateToken({ role: 'admin', ts: Date.now() })
  return NextResponse.json({ token })
}
