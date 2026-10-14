import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { Storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
  }

  const users = await Storage.getAllUsers();
  return NextResponse.json({ users });
}
