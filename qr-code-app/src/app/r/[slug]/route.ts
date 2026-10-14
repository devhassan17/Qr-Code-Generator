import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';
import { parseUserAgent } from '@/lib/userAgent';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;
  const qrItem = Storage.getQRCodeBySlug(slug);

  if (!qrItem) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>QR Code Not Found</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; text-align:center; padding:20px; }
            .box { background:#1e293b; padding:40px; border-radius:16px; border:1px solid #334155; max-width:400px; }
            h1 { font-size:24px; margin-bottom:10px; color:#ef4444; }
            p { color:#94a3b8; font-size:14px; line-height:1.6; }
          </style>
        </head>
        <body>
          <div class="box">
            <h1>404 &bull; QR Code Not Found</h1>
            <p>The QR code you scanned (<code>${slug}</code>) does not exist or may have been removed.</p>
          </div>
        </body>
      </html>`,
      { status: 404, headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (!qrItem.isActive) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Campaign Paused</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; text-align:center; padding:20px; }
            .box { background:#1e293b; padding:40px; border-radius:16px; border:1px solid #334155; max-width:400px; }
            h1 { font-size:22px; margin-bottom:10px; color:#f59e0b; }
            p { color:#94a3b8; font-size:14px; }
          </style>
        </head>
        <body>
          <div class="box">
            <h1>Campaign Temporarily Inactive</h1>
            <p>This QR code campaign is currently paused. Please check back later.</p>
          </div>
        </body>
      </html>`,
      { status: 403, headers: { 'Content-Type': 'text/html' } }
    );
  }

  // Parse visitor information
  const userAgent = request.headers.get('user-agent');
  const referer = request.headers.get('referer') || 'Direct / QR Camera Scan';
  const country = request.headers.get('x-vercel-ip-country') || 'US';
  const city = request.headers.get('x-vercel-ip-city') || 'Direct Scan';

  const { deviceType, os, browser } = parseUserAgent(userAgent);

  // Record scan in storage
  try {
    Storage.recordScan({
      qrCodeId: qrItem.id,
      slug: qrItem.slug,
      deviceType,
      os,
      browser,
      country,
      city,
      referer,
      userAgent: userAgent || 'Unknown'
    });
  } catch (err) {
    console.error('Error logging scan:', err);
  }

  // Redirect instantly to the destination URL
  let targetUrl = qrItem.destinationUrl;
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  return NextResponse.redirect(targetUrl, 307);
}
