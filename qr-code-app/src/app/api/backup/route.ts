import { NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';

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
