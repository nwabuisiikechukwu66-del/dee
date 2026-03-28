import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { getConvexClient } from '@/lib/convex-server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'dee-audiobook-secret-please-change-in-production'
)

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Try Convex first, fall back to local demo mode
    let user: any = null

    try {
      const convex = getConvexClient()
      user = await convex.query('users:getUserByEmail', { email: email.toLowerCase() })
    } catch {
      // Convex not configured — check localStorage-based demo users
      // This is handled client-side in local mode
      return NextResponse.json({ error: 'Backend not configured', localMode: true }, { status: 503 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const token = await new SignJWT({
      sub: user._id,
      email: user.email,
      username: user.username,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .setIssuedAt()
      .sign(JWT_SECRET)

    const response = NextResponse.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarEmoji: user.avatarEmoji,
      },
    })

    response.cookies.set('dee-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('[auth/login]', err)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
