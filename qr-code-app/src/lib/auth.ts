import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'user';
}

export function encodeSession(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString('base64');
}

export function decodeSession(token?: string | null): SessionUser | null {
  if (!token) return null;

  // Legacy fallback if token was static string
  if (token === 'authenticated_admin_session') {
    return {
      id: 'usr_admin',
      username: 'admin',
      name: 'Administrator',
      role: 'admin',
    };
  }

  try {
    const json = Buffer.from(token, 'base64').toString('utf-8');
    const parsed = JSON.parse(json);
    if (parsed && parsed.id && parsed.username && parsed.role) {
      return parsed as SessionUser;
    }
  } catch {
    return null;
  }
  return null;
}

export function getSessionUserFromRequest(request: NextRequest): SessionUser | null {
  const token = request.cookies.get('qr_session_auth')?.value;
  return decodeSession(token);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('qr_session_auth')?.value;
    return decodeSession(token);
  } catch {
    return null;
  }
}
