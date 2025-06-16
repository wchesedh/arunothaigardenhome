'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, UserPlus, Search, Trash2 } from 'lucide-react';

type Tenant = {
  id: string;
  full_name: string;
  contact_info: string | null;
  created_at: string;
};

type Apartment = {
  id: string;
  name: string;
  base_price: number;
  description: string | null;
  room_count: number | null;
  created_at: string;
  next_payment_due: string | null;
};

type Props = {
  apartmentId: string;
  apartmentName: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function AssignTenantModal({ apartmentId, apartmentName, onClose, onSaved }: Props) {
  const [selectedTenants, setSelectedTenants] = useState<Tenant[]>([]);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewTenantForm, setShowNewTenantForm] = useState(false);
  const [newTenant, setNewTenant] = useState<{ full_name: string; contact_info: string }>({
    full_name: '',
    contact_info: ''
  });
  const [pendingNewTenant, setPendingNewTenant] = useState<{ full_name: string; contact_info: string } | null>(null);
  const [assignedDate, setAssignedDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [price, setPrice] = useState('');
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRenewal, setIsRenewal] = useState(false);

  useEffect(() => {
    fetchApartmentDetails();
    fetchAvailableTenants();
  }, []);

  useEffect(() => {
    // Set assigned date to today
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    setAssignedDate(formattedToday);

    // Set due date to same day next month
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const formattedNextMonth = nextMonth.toISOString().split('T')[0];
    setDueDate(formattedNextMonth);
  }, []);

  const fetchApartmentDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('apartments')
        .select('*')
        .eq('id', apartmentId)
        .single();

      if (error) throw error;
      setApartment(data);
      setPrice(data.base_price.toString());
    } catch (err) {
      console.error('Error fetching apartment details:', err);
      setError('Failed to load apartment details');
    }
  };

  const fetchAvailableTenants = async () => {
    try {
      // First get all active tenants
      const { data: allTenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .eq('status', 'active')
        .order('full_name');

      if (tenantsError) throw tenantsError;

      // Get all active apartment assignments
      const { data: activeAssignments, error: assignmentsError } = await supabase
        .from('apartment_tenants')
        .select(`
          id,
          members:apartment_tenant_members(
            tenant_id
          )
        `)
        .eq('status', 'active');

      if (assignmentsError) throw assignmentsError;

      // Create a set of tenant IDs who are already assigned
      const assignedTenantIds = new Set(
        activeAssignments?.flatMap(group => 
          group.members?.map(member => member.tenant_id) || []
        ) || []
      );

      // Filter out already assigned tenants
      const available = allTenants?.filter(tenant => !assignedTenantIds.has(tenant.id)) || [];
      setAvailableTenants(available);
    } catch (err) {
      console.error('Error fetching tenants:', err);
      setError('Failed to load tenants');
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

    if (!price || !assignedDate || !dueDate) {
      alert('Please fill in all required fields')
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

      // Create the rental group
      const { data: group, error: groupError } = await supabase
        .from('apartment_tenants')
        .insert([{
          apartment_id: apartmentId,
          assigned_date: assignedDate,
          due_date: dueDate,
          price: price,
          payment_status: 'unpaid',
          status: 'active'
        }])
        .select()
        .single()

      if (groupError) throw groupError

      // Add all tenants to the group
      const { error: membersError } = await supabase
        .from('apartment_tenant_members')
        .insert(
          tenantIds.map(tenantId => ({
            apartment_tenant_id: group.id,
            tenant_id: tenantId
          }))
        )

      if (membersError) throw membersError

      onSaved()
    } catch (err) {
      console.error('Error creating rental:', err)
      alert('Error creating rental. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredTenants = availableTenants.filter(tenant =>
    tenant.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tenant.contact_info && tenant.contact_info.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addTenant = (tenant: Tenant) => {
    if (!selectedTenants.find(t => t.id === tenant.id)) {
      setSelectedTenants(prev => [...prev, tenant]);
    }
  };

  const removeTenant = (tenantId: string) => {
    setSelectedTenants(prev => prev.filter(t => t.id !== tenantId));
  };

  const handleConfirm = async () => {
    if (selectedTenants.length === 0) {
      alert('Please select at least one tenant')
      return
    }

    try {
      const today = new Date()
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      // Create new rental record
      const { data: newRental, error: rentalError } = await supabase
        .from('apartment_tenants')
        .insert({
          apartment_id: apartmentId,
          assigned_date: today.toISOString(),
          due_date: nextMonth.toISOString(),
          price: parseFloat(price),
          payment_status: 'unpaid',
          status: 'active'
        })
        .select()
        .single()

      if (rentalError) throw rentalError

      // Add selected tenants to the rental
      const { error: membersError } = await supabase
        .from('apartment_tenant_members')
        .insert(
          selectedTenants.map(tenant => ({
            apartment_tenant_id: newRental.id,
            tenant_id: tenant.id,
            added_at: today.toISOString()
          }))
        )

      if (membersError) throw membersError

      onSaved()
    } catch (err) {
      console.error('Error creating rental:', err)
      alert('Error creating rental. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[90%] max-w-2xl shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Create Rental for {apartmentName}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Date and Price Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={assignedDate}
                onChange={(e) => setAssignedDate(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Price (THB)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter price"
              />
            </div>
          </div>

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
                  if (tenant) addTenant(tenant)
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
                      onClick={() => removeTenant(tenant.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:underline"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (selectedTenants.length === 0) {
                  alert('Please select at least one tenant')
                  return
                }
                if (!price) {
                  alert('Please enter a monthly price')
                  return
                }
                setShowConfirm(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Rental
            </button>
          </div>

          {showConfirm && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <p className="text-gray-700 mb-6">
                You are about to create a new rental with {selectedTenants.length} tenant{selectedTenants.length !== 1 ? 's' : ''}.<br />
                The rental period will start from today and be due next month.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 text-gray-600 hover:underline"
                  onClick={() => {
                    setShowConfirm(false)
                    setSelectedTenants([])
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={handleConfirm}
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
