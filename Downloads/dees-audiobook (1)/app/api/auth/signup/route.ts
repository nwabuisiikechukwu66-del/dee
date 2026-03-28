import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { getConvexClient } from '@/lib/convex-server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'dee-audiobook-secret-please-change-in-production'
)

export async function POST(req: NextRequest) {
  try {
    const { email, password, username, displayName } = await req.json()

    if (!email || !password || !username) {
      return NextResponse.json({ error: 'Email, password, and username are required' }, { status: 400 })
    }

    if (username.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    try {
      const convex = getConvexClient()
      const userId = await convex.mutation('users:createUser', {
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        displayName: displayName || username,
      })

      const user = await convex.query('users:getUserById', { userId })

      const token = await new SignJWT({
        sub: userId,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('30d')
        .setIssuedAt()
        .sign(JWT_SECRET)

      const response = NextResponse.json({
        user: {
          _id: userId,
          username: username.toLowerCase(),
          email: email.toLowerCase(),
          displayName: displayName || username,
          avatarEmoji: user?.avatarEmoji ?? '📖',
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
    } catch (err: any) {
      if (err.message === 'EMAIL_TAKEN') {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
      }
      if (err.message === 'USERNAME_TAKEN') {
        return NextResponse.json({ error: 'This username is taken' }, { status: 409 })
      }
      // Convex not set up — return local mode signal
      return NextResponse.json({ error: 'Backend not configured', localMode: true }, { status: 503 })
    }
  } catch (err) {
    console.error('[auth/signup]', err)
    return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 })
  }
}
