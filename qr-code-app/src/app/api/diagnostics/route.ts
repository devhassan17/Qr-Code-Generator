import { NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const diagnostics = await Storage.getStorageDiagnostics();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...diagnostics,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error running diagnostics' },
      { status: 500 }
    );
  }
}
