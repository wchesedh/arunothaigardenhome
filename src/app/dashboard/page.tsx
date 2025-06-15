'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/layouts/AdminLayout';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600 mb-4">Welcome to the admin panel of Arunothai Garden Home.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-blue-100 text-blue-800 p-4 rounded-lg shadow">📦 Total Apartments: 30</div>
          <div className="bg-green-100 text-green-800 p-4 rounded-lg shadow">👥 Active Tenants: 25</div>
          <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg shadow">🛠️ Units Under Maintenance: 2</div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
