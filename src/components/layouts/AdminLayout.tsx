'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: '🏠 Dashboard' },
    { href: '/apartments', label: '🏢 Apartments' },
    { href: '/tenants', label: '👥 Tenants' },
    { href: '/maintenance', label: '🛠️ Maintenance' },
  ];

  return (
    <div className="flex min-h-screen bg-blue-50 text-gray-800">
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-white shadow-md p-4 z-50 flex justify-between items-center">
        <h2 className="text-xl font-bold text-blue-600">🏡 Arunothai</h2>
        <button
          className="text-2xl focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          ☰
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 w-64 h-screen bg-white shadow-md p-6 z-40 transform transition-transform duration-300
          flex flex-col justify-between
          overflow-y-auto md:overflow-visible
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:z-50
        `}
      >
        <div>
          <h2 className="text-xl font-bold text-blue-600 mb-6">🏡 Arunothai</h2>
          <ul className="space-y-2">
            {navItems.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setIsOpen(false)}
                    className={`
                      block px-4 py-2 rounded transition
                      ${isActive ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700'}
                      hover:bg-blue-50 hover:text-blue-700
                    `}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Mobile-only Logout */}
        <div className="md:hidden pt-6 border-t mt-6">
          <button
            onClick={() => {
              setIsOpen(false);
              alert('Logged out'); // Replace with actual logout logic
            }}
            className="text-red-600 hover:underline"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 p-8 pt-20 md:pt-8 md:ml-64">
        {children}
      </main>
    </div>
  );
}
