import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Studio from './Studio';

export const dynamic = 'force-dynamic';

export default async function StudioPage({ searchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const params = await searchParams;
  return <Studio initialTab={params?.tab === 'credits' ? 'credits' : 'create'} purchase={params?.purchase || null} />;
}
