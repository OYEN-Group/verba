import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  const headersList = headers();
  const authHeader = headersList.get('Authorization');

  const options: any = {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: any[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignore
        }
      },
    },
  };

  if (authHeader) {
    options.global = {
      headers: {
        Authorization: authHeader,
      },
    };
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options
  );
}
