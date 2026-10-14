import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  const qrCodes = await Storage.getAllQRCodes();
  return NextResponse.json({ qrCodes });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, slug, destinationUrl, colorDark, colorLight, notes, isActive } = body;

    if (!title || !slug || !destinationUrl) {
      return NextResponse.json(
        { error: 'Title, Slug, and Destination URL are required.' },
        { status: 400 }
      );
    }

    // Clean slug
    const cleanSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, '-');

    // Check duplicate slug
    const existing = await Storage.getQRCodeBySlug(cleanSlug);
    if (existing) {
      return NextResponse.json(
        { error: `The short slug "${cleanSlug}" is already in use. Please pick another.` },
        { status: 409 }
      );
    }

    const created = await Storage.createQRCode({
      title: title.trim(),
      slug: cleanSlug,
      destinationUrl: destinationUrl.trim(),
      colorDark: colorDark || '#0f172a',
      colorLight: colorLight || '#ffffff',
      notes: notes || '',
      isActive: isActive !== false
    });

    return NextResponse.json({ qrCode: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
