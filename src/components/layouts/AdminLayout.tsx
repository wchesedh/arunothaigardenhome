'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 h-screen fixed left-0 top-0 bg-white shadow-lg z-40 flex flex-col p-6">
        <h2 className="text-2xl font-bold text-blue-600 mb-8">🏡 Arunothai</h2>
        <nav className="flex flex-col gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-2 rounded-md text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition"
          >
            🏠 Dashboard
          </Link>
          <Link
            href="/apartments"
            className="flex items-center gap-3 px-4 py-2 rounded-md text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition"
          >
            🏢 Apartments
          </Link>
          <Link
            href="/tenants"
            className="flex items-center gap-3 px-4 py-2 rounded-md text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition"
          >
            👥 Tenants
          </Link>
          <Link
            href="/maintenance"
            className="flex items-center gap-3 px-4 py-2 rounded-md text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition"
          >
            🛠️ Maintenance
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-6">
        <div className="bg-white p-6 rounded-lg shadow-md">{children}</div>
      </main>
    </div>
  );
}
