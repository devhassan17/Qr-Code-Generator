import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';
import { encodeSession, SessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { username, name, password } = await request.json();

    if (!username || !name || !password) {
      return NextResponse.json(
        { success: false, error: 'All fields (Username, Name, Password) are required' },
        { status: 400 }
      );
    }

    const cleanUser = username.trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,24}$/.test(cleanUser)) {
      return NextResponse.json(
        { success: false, error: 'Username must be 3-24 characters (letters, numbers, hyphens, underscores only)' },
        { status: 400 }
      );
    }

    if (cleanUser === 'admin') {
      return NextResponse.json(
        { success: false, error: 'Cannot register with reserved username "admin"' },
        { status: 400 }
      );
    }

    const existing = await Storage.getUserByUsername(cleanUser);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'This username is already taken. Please choose another.' },
        { status: 400 }
      );
    }

    const newUser = await Storage.createUser({
      username: cleanUser,
      name: name.trim(),
      password: password,
      role: 'user',
    });

    const sessionUser: SessionUser = {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      role: newUser.role,
    };

    const response = NextResponse.json({
      success: true,
      user: sessionUser,
      message: 'Profile created successfully',
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
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error creating profile' },
      { status: 500 }
    );
  }
}
