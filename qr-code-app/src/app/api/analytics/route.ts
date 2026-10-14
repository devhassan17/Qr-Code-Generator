import { NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  const qrCodes = await Storage.getAllQRCodes();
  const scans = await Storage.getAllScans();

  const totalScans = scans.length;
  const activeQRs = qrCodes.filter(q => q.isActive).length;

  let mobileScans = 0;
  const scansByDay: Record<string, number> = {};

  // Last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    scansByDay[dateStr] = 0;
  }

  scans.forEach(scan => {
    if (scan.deviceType === 'mobile') mobileScans++;
    const dateStr = scan.timestamp.split('T')[0];
    if (scansByDay[dateStr] !== undefined) {
      scansByDay[dateStr]++;
    }
  });

  const mobilePercent = totalScans > 0 ? Math.round((mobileScans / totalScans) * 100) : 0;

  return NextResponse.json({
    overview: {
      totalQRCodes: qrCodes.length,
      activeQRCodes: activeQRs,
      totalScans,
      mobileScans,
      mobilePercent
    },
    trend: Object.keys(scansByDay)
      .sort()
      .map(date => ({ date, count: scansByDay[date] }))
  });
}
