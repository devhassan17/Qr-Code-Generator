import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    const validUser = 'admin';
    const validPass = 'Qwerty123!@#';

    if (
      username &&
      username.trim().toLowerCase() === validUser &&
      password === validPass
    ) {
      const response = NextResponse.json({
        success: true,
        message: 'Authentication successful',
      });

      // Set cookie for 30 days
      response.cookies.set({
        name: 'qr_session_auth',
        value: 'authenticated_admin_session',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Invalid Username or Password' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
