import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AccountClient } from './AccountClient';

export default async function AccountPage() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const name = user.user_metadata?.full_name || user.user_metadata?.name || '';
  const email = user.email || '';
  const createdAt = user.created_at;

  return (
    <AccountClient 
      initialName={name} 
      email={email} 
      createdAt={createdAt} 
    />
  );
}
