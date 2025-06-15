'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X } from 'lucide-react';

type Tenant = {
  id: string;
  full_name: string;
  contact_info: string | null;
  created_at: string;
};

type AssignTenantModalProps = {
  apartmentId: string;
  apartmentName: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function AssignTenantModal({ apartmentId, apartmentName, onClose, onSaved }: AssignTenantModalProps) {
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    const fetchTenants = async () => {
      setLoading(true);
      setError(null);
      try {
        // First, get all tenants
        const { data: allTenants, error: tenantsError } = await supabase
          .from('tenants')
          .select('*')
          .order('full_name');

        if (tenantsError) {
          console.error('Error fetching all tenants:', tenantsError);
          throw new Error(`Failed to fetch tenants: ${tenantsError.message}`);
        }

        if (!allTenants) {
          throw new Error('No tenants data received');
        }

        // Get tenants already assigned to this apartment through apartment_tenants and apartment_tenant_members
        const { data: assignedTenants, error: assignedError } = await supabase
          .from('apartment_tenants')
          .select(`
            id,
            members:apartment_tenant_members(
              tenant_id
            )
          `)
          .eq('apartment_id', apartmentId)
          .eq('status', 'active');

        if (assignedError) {
          console.error('Error fetching assigned tenants:', assignedError);
          throw new Error(`Failed to fetch assigned tenants: ${assignedError.message}`);
        }

        // Extract all tenant IDs from the active apartment tenant groups
        const assignedTenantIds = new Set(
          assignedTenants?.flatMap(group => 
            group.members?.map(member => member.tenant_id) || []
          ) || []
        );

        // Filter out already assigned tenants
        const available = allTenants.filter(tenant => !assignedTenantIds.has(tenant.id));
        
        setAvailableTenants(available);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        console.error('Error in fetchTenants:', err);
        setError(`Failed to load tenants: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, [apartmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create apartment_tenants record
      const { data: apartmentTenant, error: tenantError } = await supabase
        .from('apartment_tenants')
        .insert({
          apartment_id: apartmentId,
          due_date: dueDate,
          price: parseFloat(price),
          payment_status: 'unpaid',
          status: 'active'
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // Add all selected tenants as members
      const memberPromises = selectedTenants.map(tenantId =>
        supabase
          .from('apartment_tenant_members')
          .insert({
            apartment_tenant_id: apartmentTenant.id,
            tenant_id: tenantId
          })
      );

      await Promise.all(memberPromises);
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error assigning tenants:', err);
      setError('Failed to assign tenants. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTenant = (tenantId: string) => {
    setSelectedTenants(prev =>
      prev.includes(tenantId)
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[90%] max-w-2xl shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Assign Tenants to {apartmentName}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Tenants
            </label>
            <div className="max-h-48 overflow-y-auto border rounded">
              {availableTenants.map(tenant => (
                <label
                  key={tenant.id}
                  className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedTenants.includes(tenant.id)}
                    onChange={() => toggleTenant(tenant.id)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">
                      {tenant.full_name}
                    </div>
                    {tenant.contact_info && (
                      <div className="text-sm text-gray-500">
                        {tenant.contact_info}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border rounded px-3 py-2"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Price (THB)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Enter monthly price"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:underline"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={loading || selectedTenants.length === 0}
            >
              {loading ? 'Assigning...' : 'Assign Tenants'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
