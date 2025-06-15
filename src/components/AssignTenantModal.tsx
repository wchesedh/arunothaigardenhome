'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Tenant = {
  id: string;
  full_name: string;
  phone_number?: string;
  email?: string;
  move_in_date?: string;
};

export default function AssignTenantModal({
  apartmentId,
  onClose,
  onAssigned,
}: {
  apartmentId: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [showNewTenantForm, setShowNewTenantForm] = useState(false);
  const [newTenant, setNewTenant] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    move_in_date: today,
  });

  const [errors, setErrors] = useState({
    phone: '',
    email: '',
  });

  const isFormValid =
    newTenant.full_name.trim() &&
    /^\d{11}$/.test(newTenant.phone_number) &&
    (!newTenant.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newTenant.email));

  useEffect(() => {
    const fetchTenants = async () => {
      const { data, error } = await supabase.from('tenants').select('*');
      if (!error && data) setTenants(data);
    };
    fetchTenants();
  }, []);

  const handleCreateNewTenant = async () => {
    const moveInDate = newTenant.move_in_date || today;

    const { data, error } = await supabase
      .from('tenants')
      .insert([
        {
          ...newTenant,
          move_in_date: moveInDate,
        },
      ])
      .select()
      .single();

    if (!error && data) {
      setSelectedTenantId(data.id);

      const { error: linkError } = await supabase.from('apartment_tenants').insert([
        {
          apartment_id: apartmentId,
          tenant_id: data.id,
        },
      ]);

      if (!linkError) {
        onAssigned();
        onClose();
      }
    }
  };

  const handleAssignExistingTenant = async () => {
    if (!selectedTenantId) return;

    const { error } = await supabase.from('apartment_tenants').insert([
      {
        apartment_id: apartmentId,
        tenant_id: selectedTenantId,
      },
    ]);

    if (!error) {
      onAssigned();
      onClose();
    }
  };

  const handlePhoneChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 11); // only digits, max 11
    setNewTenant({ ...newTenant, phone_number: numericValue });

    if (numericValue.length !== 11) {
      setErrors((prev) => ({ ...prev, phone: 'Phone must be exactly 11 digits' }));
    } else {
      setErrors((prev) => ({ ...prev, phone: '' }));
    }
  };

  const handleEmailChange = (value: string) => {
    setNewTenant({ ...newTenant, email: value });

    if (
      value &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ) {
      setErrors((prev) => ({ ...prev, email: 'Invalid email format' }));
    } else {
      setErrors((prev) => ({ ...prev, email: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Assign Tenant</h2>

        {!showNewTenantForm ? (
          <>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full border p-2 rounded mb-4"
            >
              <option value="">Select a tenant</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.full_name} - {tenant.phone_number || 'No phone'} - {tenant.email || 'No email'}
                </option>
              ))}
            </select>

            <div className="flex justify-between items-center mb-4">
              <button
                className="text-blue-600 hover:underline text-sm"
                onClick={() => setShowNewTenantForm(true)}
              >
                ➕ Create new tenant
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
                Cancel
              </button>
              <button
                onClick={handleAssignExistingTenant}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                disabled={!selectedTenantId}
              >
                Assign
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Full name"
                className="w-full border p-2 rounded"
                value={newTenant.full_name}
                onChange={(e) => setNewTenant({ ...newTenant, full_name: e.target.value })}
              />
              <div>
                <input
                  type="text"
                  placeholder="Phone number (11 digits)"
                  className="w-full border p-2 rounded"
                  value={newTenant.phone_number}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full border p-2 rounded"
                  value={newTenant.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
              <input
                type="date"
                className="w-full border p-2 rounded"
                value={newTenant.move_in_date}
                onChange={(e) => setNewTenant({ ...newTenant, move_in_date: e.target.value })}
              />
            </div>

            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setShowNewTenantForm(false)}
                className="text-sm text-gray-600 hover:underline"
              >
                ⬅ Back to list
              </button>

              <div className="flex gap-2">
                <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
                  Cancel
                </button>
                <button
                  onClick={handleCreateNewTenant}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  disabled={!isFormValid}
                >
                  Create & Assign
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
