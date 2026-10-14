import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';
import { encodeSession, SessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const cleanUser = username.trim().toLowerCase();

    // 1. Direct Admin Credential Check
    if (cleanUser === 'admin' && password === 'Qwerty123!@#') {
      const sessionUser: SessionUser = {
        id: 'usr_admin',
        username: 'admin',
        name: 'Administrator',
        role: 'admin',
      };

      const response = NextResponse.json({
        success: true,
        user: sessionUser,
        message: 'Admin authentication successful',
      });

      response.cookies.set({
        name: 'qr_session_auth',
        value: encodeSession(sessionUser),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return response;
    }

    // 2. Database User Profile Check
    const user = await Storage.getUserByUsername(cleanUser);
    if (user && user.password === password) {
      const sessionUser: SessionUser = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      };

      const response = NextResponse.json({
        success: true,
        user: sessionUser,
        message: 'Login successful',
      });

      response.cookies.set({
        name: 'qr_session_auth',
        value: encodeSession(sessionUser),
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
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
