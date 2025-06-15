'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setLoggedIn(!!session?.user)
      setHasMounted(true)
    }

    getSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user)
    })

    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [])

  const closeMenu = () => setMenuOpen(false)

  return (
    <nav className="bg-white shadow px-4 py-3 sm:px-6 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-blue-600">
          <Link href="/" onClick={closeMenu}>🏡 Arunothai</Link>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-gray-700 sm:hidden text-2xl focus:outline-none"
        >
          ☰
        </button>

        <div className="hidden sm:flex space-x-4 items-center text-sm">
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          <Link href="/apartments" className="hover:underline">Apartments</Link>
          {hasMounted && (
            loggedIn ? (
              <Link href="/logout" className="hover:underline text-red-500">Logout</Link>
            ) : (
              <Link href="/login" className="hover:underline text-blue-500">Login</Link>
            )
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden mt-3 flex flex-col space-y-2 text-sm">
          <Link href="/dashboard" className="hover:underline" onClick={closeMenu}>
            Dashboard
          </Link>
          <Link href="/apartments" className="hover:underline" onClick={closeMenu}>
            Apartments
          </Link>
          {hasMounted && (
            loggedIn ? (
              <Link href="/logout" className="hover:underline text-red-500" onClick={closeMenu}>
                Logout
              </Link>
            ) : (
              <Link href="/login" className="hover:underline text-blue-500" onClick={closeMenu}>
                Login
              </Link>
            )
          )}
        </div>
      )}
    </nav>
  )
}
