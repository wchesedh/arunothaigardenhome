'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      await supabase.auth.signOut();
      router.push('/login');
    };
    logout();
  }, [router]);

  return <p className="text-center mt-10 text-gray-500">Logging out...</p>;
}
