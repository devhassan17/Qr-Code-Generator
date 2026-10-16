import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientQRs } = body;

    const mergedQRs = await Storage.syncExternalQRCodes(clientQRs || []);

    return NextResponse.json({
      success: true,
      qrCodes: mergedQRs,
      message: 'Storage vault synchronized successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Sync error' },
      { status: 500 }
    );
  }
}
