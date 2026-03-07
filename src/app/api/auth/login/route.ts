import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminPassword, verifyViewerPassword, generateToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (verifyAdminPassword(password)) {
    const token = generateToken({ role: 'admin', ts: Date.now() })
    return NextResponse.json({ token, role: 'admin' })
  }

  if (verifyViewerPassword(password)) {
    const token = generateToken({ role: 'kementerian', ts: Date.now() })
    return NextResponse.json({ token, role: 'kementerian' })
  }

  return NextResponse.json({ error: 'Password salah' }, { status: 401 })
}
