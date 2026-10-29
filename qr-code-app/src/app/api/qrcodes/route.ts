import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@/lib/storage';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let filterUserId: string | undefined = undefined;
  if (sessionUser.role === 'admin') {
    const requestedUser = request.nextUrl.searchParams.get('userId');
    if (requestedUser && requestedUser !== 'all') {
      filterUserId = requestedUser;
    }
  } else {
    // Non-admin users are strictly restricted to only seeing their own QR codes
    filterUserId = sessionUser.id;
  }

  const qrCodes = await Storage.getAllQRCodes(filterUserId);
  return NextResponse.json({ qrCodes });
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, slug, destinationUrl, colorDark, colorLight, notes, isActive, assignedUserId } = body;

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

    let creatorId = sessionUser.id;
    let creatorName = sessionUser.name;

    // Only administrators can assign QR codes to other user profiles
    if (sessionUser.role === 'admin' && assignedUserId) {
      const assignedUser = await Storage.getUserById(assignedUserId);
      if (assignedUser) {
        creatorId = assignedUser.id;
        creatorName = assignedUser.name;
      }
    }

    const created = await Storage.createQRCode({
      title: title.trim(),
      slug: cleanSlug,
      destinationUrl: destinationUrl.trim(),
      colorDark: colorDark || '#0f172a',
      colorLight: colorLight || '#ffffff',
      notes: notes || '',
      isActive: isActive !== false,
      createdByUserId: creatorId,
      createdByName: creatorName,
    });

    return NextResponse.json({ qrCode: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
