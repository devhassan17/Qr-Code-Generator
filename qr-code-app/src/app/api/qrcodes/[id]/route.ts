import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';
import { getSessionUser } from '@/lib/auth';
import { QRCodeWithStats } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const qrItem = await Storage.getQRCodeById(params.id);
  if (!qrItem) {
    return NextResponse.json({ error: 'QR Code not found' }, { status: 404 });
  }

  // Non-admins can only view stats for their own QR codes
  if (sessionUser.role !== 'admin' && qrItem.createdByUserId !== sessionUser.id) {
    return NextResponse.json({ error: 'Forbidden. You do not own this campaign.' }, { status: 403 });
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

  scans.forEach((scan) => {
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
    .map((date) => ({ date, count: timelineMap[date] }));

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
      timeline,
    },
  };

  return NextResponse.json({ qrCode: responseData });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const qrItem = await Storage.getQRCodeById(params.id);
    if (!qrItem) {
      return NextResponse.json({ error: 'QR Code not found' }, { status: 404 });
    }

    if (sessionUser.role !== 'admin' && qrItem.createdByUserId !== sessionUser.id) {
      return NextResponse.json({ error: 'Forbidden. You do not own this campaign.' }, { status: 403 });
    }

    const body = await request.json();
    const updates: any = {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.destinationUrl !== undefined ? { destinationUrl: body.destinationUrl } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.colorDark !== undefined ? { colorDark: body.colorDark } : {}),
      ...(body.colorLight !== undefined ? { colorLight: body.colorLight } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    };

    if (sessionUser.role === 'admin' && body.assignedUserId) {
      const assignedUser = await Storage.getUserById(body.assignedUserId);
      if (assignedUser) {
        updates.createdByUserId = assignedUser.id;
        updates.createdByName = assignedUser.name;
      }
    }

    const updated = await Storage.updateQRCode(params.id, updates);
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
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const qrItem = await Storage.getQRCodeById(params.id);
  if (!qrItem) {
    return NextResponse.json({ error: 'QR Code not found' }, { status: 404 });
  }

  if (sessionUser.role !== 'admin' && qrItem.createdByUserId !== sessionUser.id) {
    return NextResponse.json({ error: 'Forbidden. You do not own this campaign.' }, { status: 403 });
  }

  const success = await Storage.deleteQRCode(params.id);
  if (!success) {
    return NextResponse.json({ error: 'QR Code not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, message: 'QR Code permanently deleted' });
}
