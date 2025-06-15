'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setLoggedIn(!!session?.user);
    };

    getSession();

    // Listen to login/logout changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <nav className="bg-white shadow px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="font-bold text-xl">
        <Link href="/">🏡 Arunothai Garden Home</Link>
      </div>
      <div className="space-x-4">
      <Link href="/dashboard" className="hover:underline">Dashboard</Link>

        <Link href="/apartments" className="hover:underline">Apartments</Link>
        {loggedIn ? (
          <Link href="/logout" className="hover:underline text-red-500">Logout</Link>
        ) : (
          <Link href="/login" className="hover:underline text-blue-500">Login</Link>
        )}
      </div>
    </nav>
  );
}
