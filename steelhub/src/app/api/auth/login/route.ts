import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { pin } = await request.json()

  if (pin === process.env.AUTH_PIN) {
    const response = NextResponse.json({ ok: true })
    response.cookies.set('steelhub-auth', process.env.AUTH_SECRET!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
    return response
  }

  return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
}
