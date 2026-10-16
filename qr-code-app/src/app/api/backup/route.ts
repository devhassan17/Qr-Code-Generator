import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await Storage.exportDatabase();
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="qr_hub_backup_${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (!body || (!Array.isArray(body.qrCodes) && !body.users)) {
      return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
    }

    await Storage.importDatabase(body);

    return NextResponse.json({
      success: true,
      message: `Database restored successfully (${(body.qrCodes || []).length} QR codes imported)`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error restoring database' },
      { status: 500 }
    );
  }
}
