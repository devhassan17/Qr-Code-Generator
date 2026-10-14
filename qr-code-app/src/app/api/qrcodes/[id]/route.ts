import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';
import { QRCodeWithStats } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const qrItem = await Storage.getQRCodeById(params.id);
  if (!qrItem) {
    return NextResponse.json({ error: 'QR Code not found' }, { status: 404 });
  }

  const scans = await Storage.getScansForQRCode(params.id);

  // Calculate metrics
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const oneWeekAgo = new Date(Date.now() - 7 * 86400000);

  let todayCount = 0;
  let thisWeekCount = 0;

  const deviceBreakdown = { mobile: 0, desktop: 0, tablet: 0 };
  const browserBreakdown: Record<string, number> = {};
  const osBreakdown: Record<string, number> = {};
  const timelineMap: Record<string, number> = {};

  // Initialize last 7 days in timeline
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    timelineMap[dateStr] = 0;
  }

  scans.forEach(scan => {
    const scanDate = scan.timestamp.split('T')[0];
    const scanTimestamp = new Date(scan.timestamp).getTime();

    if (scanDate === todayStr) todayCount++;
    if (scanTimestamp >= oneWeekAgo.getTime()) thisWeekCount++;

    if (scan.deviceType in deviceBreakdown) {
      deviceBreakdown[scan.deviceType]++;
    }

    browserBreakdown[scan.browser] = (browserBreakdown[scan.browser] || 0) + 1;
    osBreakdown[scan.os] = (osBreakdown[scan.os] || 0) + 1;

    if (timelineMap[scanDate] !== undefined) {
      timelineMap[scanDate]++;
    }
  });

  const timeline = Object.keys(timelineMap)
    .sort()
    .map(date => ({ date, count: timelineMap[date] }));

  const responseData: QRCodeWithStats = {
    ...qrItem,
    recentScans: scans.slice(0, 50),
    stats: {
      total: scans.length,
      today: todayCount,
      thisWeek: thisWeekCount,
      deviceBreakdown,
      browserBreakdown,
      osBreakdown,
      timeline
    }
  };

  return NextResponse.json({ qrCode: responseData });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updated = await Storage.updateQRCode(params.id, body);
    if (!updated) {
      return NextResponse.json({ error: 'QR Code not found' }, { status: 404 });
    }
    return NextResponse.json({ qrCode: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error updating QR Code' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const success = await Storage.deleteQRCode(params.id);
  if (!success) {
    return NextResponse.json({ error: 'QR Code not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, message: 'QR Code archived safely' });
}
