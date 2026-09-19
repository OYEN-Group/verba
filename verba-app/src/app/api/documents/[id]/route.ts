import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  try {
    const { original_filename } = await request.json();

    if (!params.id) {
      return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (typeof original_filename !== 'string' || original_filename.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('documents')
      .update({ original_filename: original_filename.trim() })
      .eq('id', params.id)
      .eq('user_id', user.id); // ownership check

    if (updateError) {
      console.error('[patch document] error:', updateError.message);
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[patch document] unexpected error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
