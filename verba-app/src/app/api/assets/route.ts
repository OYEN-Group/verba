import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  const supabase = createClient();

  try {
    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Download the file from Supabase storage
    // The server client automatically forwards the user's auth token,
    // so Supabase RLS will ensure they only access files they are allowed to.
    const { data, error } = await supabase.storage
      .from('documents')
      .download(path);

    if (error || !data) {
      console.error('[assets] Download error:', error);
      return NextResponse.json({ error: 'Asset not found or unauthorized' }, { status: 404 });
    }

    // 3. Forward the asset with correct content type
    const contentType = data.type || 'application/octet-stream';
    const buffer = await data.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache the image in the browser for 1 hour to reduce bandwidth
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: unknown) {
    console.error('[assets] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
