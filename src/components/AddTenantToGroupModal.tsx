'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Plus, Trash2, UserPlus } from 'lucide-react';

type Tenant = {
  id: string;
  full_name: string;
  contact_info: string | null;
  created_at: string;
};

type AddTenantToGroupModalProps = {
  groupId: string;
  apartmentId: string;
  onClose: () => void;
  onSaved: (newTenants: { id: string; full_name: string; contact_info: string | null }[]) => void;
};

export default function AddTenantToGroupModal({ groupId, apartmentId, onClose, onSaved }: AddTenantToGroupModalProps) {
  const [selectedTenants, setSelectedTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewTenantForm, setShowNewTenantForm] = useState(false);
  const [newTenant, setNewTenant] = useState<{ full_name: string; contact_info: string }>({
    full_name: '',
    contact_info: ''
  });
  const [pendingNewTenant, setPendingNewTenant] = useState<{ full_name: string; contact_info: string } | null>(null);

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
      // Add all selected tenants as members
      const memberPromises = selectedTenants.map(tenant =>
        supabase
          .from('apartment_tenant_members')
          .insert({
            apartment_tenant_id: groupId,
            tenant_id: tenant.id,
            added_at: new Date().toISOString()
          })
      );

      await Promise.all(memberPromises);
      onSaved(selectedTenants.map(tenant => ({
        id: tenant.id,
        full_name: tenant.full_name,
        contact_info: tenant.contact_info
      })));
      onClose();
    } catch (err) {
      console.error('Error adding tenants to group:', err);
      setError('Failed to add tenants to group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = () => {
    if (!newTenant.full_name) {
      alert('Please enter tenant name')
      return
    }

    // Create a temporary tenant object
    const tempTenant = {
      id: `temp-${Date.now()}`, // Temporary ID
      full_name: newTenant.full_name,
      contact_info: newTenant.contact_info,
      created_at: new Date().toISOString()
    }

    // Add to selected tenants
    setSelectedTenants(prev => [...prev, tempTenant])
    
    // Store the pending new tenant data
    setPendingNewTenant(newTenant)
    
    // Clear form and hide it
    setNewTenant({ full_name: '', contact_info: '' })
    setShowNewTenantForm(false)
  }

  const handleSave = async () => {
    if (selectedTenants.length === 0) {
      alert('Please select at least one tenant')
      return
    }

    try {
      setLoading(true)

      // First create any pending new tenants
      const tenantIds = await Promise.all(
        selectedTenants.map(async (tenant) => {
          if (tenant.id.startsWith('temp-')) {
            // This is a new tenant that needs to be created
            const { data: newTenant, error: tenantError } = await supabase
              .from('tenants')
              .insert([{
                full_name: tenant.full_name,
                contact_info: tenant.contact_info
              }])
              .select()
              .single()

            if (tenantError) throw tenantError
            return newTenant.id
          }
          return tenant.id
        })
      )

      // Add all tenants to the group
      const { error: membersError } = await supabase
        .from('apartment_tenant_members')
        .insert(
          tenantIds.map(tenantId => ({
            apartment_tenant_id: groupId,
            tenant_id: tenantId
          }))
        )

      if (membersError) throw membersError

      onSaved(selectedTenants.map(tenant => ({
        id: tenant.id,
        full_name: tenant.full_name,
        contact_info: tenant.contact_info
      })));
    } catch (err) {
      console.error('Error adding tenants:', err)
      alert('Error adding tenants. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addTenantToSelection = (tenant: Tenant) => {
    if (!selectedTenants.some(t => t.id === tenant.id)) {
      setSelectedTenants(prev => [...prev, tenant]);
    }
  };

  const removeTenantFromSelection = (tenantId: string) => {
    setSelectedTenants(prev => prev.filter(t => t.id !== tenantId));
  };

  const filteredTenants = availableTenants.filter(tenant =>
    tenant.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[90%] max-w-2xl shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Add Tenants to Rental Group</h2>
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

        <div className="space-y-6">
          {/* Tenant Selection */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Select Tenants</h3>
              <button
                onClick={() => setShowNewTenantForm(true)}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <UserPlus className="w-4 h-4" />
                New Tenant
              </button>
            </div>

            {/* New Tenant Form */}
            {showNewTenantForm && (
              <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">Add New Tenant</h4>
                  <button
                    onClick={() => setShowNewTenantForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={newTenant.full_name}
                      onChange={(e) => setNewTenant(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Info
                    </label>
                    <input
                      type="text"
                      value={newTenant.contact_info}
                      onChange={(e) => setNewTenant(prev => ({ ...prev, contact_info: e.target.value }))}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter contact info"
                    />
                  </div>
                  <button
                    onClick={handleCreateTenant}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Create Tenant
                  </button>
                </div>
              </div>
            )}

            <div className="relative mb-4">
              <select
                value=""
                onChange={(e) => {
                  const tenant = availableTenants.find(t => t.id === e.target.value)
                  if (tenant) addTenantToSelection(tenant)
                }}
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a tenant...</option>
                {availableTenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.full_name} {tenant.contact_info ? `(${tenant.contact_info})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected Tenants */}
          {selectedTenants.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Selected Tenants</h3>
              <div className="space-y-2">
                {selectedTenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded"
                  >
                    <div>
                      <div className="font-medium">{tenant.full_name}</div>
                      {tenant.contact_info && (
                        <div className="text-sm text-gray-500">{tenant.contact_info}</div>
                      )}
                    </div>
                    <button
                      onClick={() => removeTenantFromSelection(tenant.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:underline"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={loading || selectedTenants.length === 0}
          >
            {loading ? 'Adding...' : 'Add Tenants'}
          </button>
        </div>
      </div>
    </div>
  );
} 