// src/app/tenants/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Tenant = {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  apartment_id: string;
  room_number: string;
  move_in_date: string;
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenants = async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('full_name');

      if (error) console.error('Error fetching tenants:', error);
      else setTenants(data || []);

      setLoading(false);
    };

    fetchTenants();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">👥 Tenants</h1>

      {loading ? (
        <p className="text-gray-500">Loading tenants...</p>
      ) : tenants.length === 0 ? (
        <p className="text-gray-500">No tenants found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-auto border border-gray-200 shadow-sm">
            <thead className="bg-gray-100 text-sm">
              <tr>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Phone</th>
                <th className="p-2 border">Email</th>
                <th className="p-2 border">Apartment</th>
                <th className="p-2 border">Room</th>
                <th className="p-2 border">Move-in Date</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="text-sm hover:bg-gray-50">
                  <td className="p-2 border font-medium">{t.full_name}</td>
                  <td className="p-2 border">{t.phone_number}</td>
                  <td className="p-2 border">{t.email}</td>
                  <td className="p-2 border">{t.apartment_id}</td>
                  <td className="p-2 border">{t.room_number}</td>
                  <td className="p-2 border">{new Date(t.move_in_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
