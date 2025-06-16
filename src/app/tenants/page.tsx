'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminLayout from '@/components/layouts/AdminLayout'
import { Pencil, XCircle, CheckCircle } from 'lucide-react'

type Tenant = {
  id: string
  full_name: string
  contact_info: string | null
  created_at: string
  status: 'active' | 'inactive'
  current_apartment?: {
    id: string
    name: string
    payment_status: 'paid' | 'unpaid' | 'partial'
    due_date: string
  } | null
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [search, setSearch] = useState('')
  const [perPage, setPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [fullName, setFullName] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [tenantToUpdate, setTenantToUpdate] = useState<Tenant | null>(null)

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    const { data, error } = await supabase
      .from('tenants')
      .select(`
        *,
        current_apartment:apartment_tenant_members(
          apartment_tenant:apartment_tenants(
            apartment:apartments(
              id,
              name
            ),
            payment_status,
            due_date
          )
        )
      `)
      .eq('apartment_tenant_members.apartment_tenant.status', 'active')
      .order('created_at', { ascending: false })

    if (!error && data) {
      // Transform the data to flatten the nested structure
      const transformedData = data.map(tenant => ({
        ...tenant,
        current_apartment: tenant.current_apartment?.[0]?.apartment_tenant ? {
          id: tenant.current_apartment[0].apartment_tenant.apartment.id,
          name: tenant.current_apartment[0].apartment_tenant.apartment.name,
          payment_status: tenant.current_apartment[0].apartment_tenant.payment_status,
          due_date: tenant.current_apartment[0].apartment_tenant.due_date
        } : null
      }))
      setTenants(transformedData)
    }
  }

  const resetForm = () => {
    setFullName('')
    setContactInfo('')
    setEditingTenant(null)
    setFormOpen(false)
  }

  const handleSave = async () => {
    if (!fullName.trim()) {
      alert('Full name is required.')
      return
    }

    if (editingTenant) {
      const { error } = await supabase
        .from('tenants')
        .update({ 
          full_name: fullName, 
          contact_info: contactInfo 
        })
        .eq('id', editingTenant.id)
      if (!error) {
        fetchTenants()
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from('tenants')
        .insert({ 
          full_name: fullName, 
          contact_info: contactInfo,
          status: 'active'
        })
      if (!error) {
        fetchTenants()
        resetForm()
      }
    }
  }

  const handleStatusChange = async () => {
    if (!tenantToUpdate) return
    
    const newStatus = tenantToUpdate.status === 'active' ? 'inactive' : 'active'
    const { error } = await supabase
      .from('tenants')
      .update({ status: newStatus })
      .eq('id', tenantToUpdate.id)
    
    if (!error) {
      fetchTenants()
      setShowStatusConfirm(false)
      setTenantToUpdate(null)
    }
  }

  const getDaysLeft = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const filtered = tenants.filter(t => t.full_name.toLowerCase().includes(search.toLowerCase()))
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage)
  const pageCount = Math.ceil(filtered.length / perPage)

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded shadow p-6 flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">👥 Tenants</h1>
            <p className="text-gray-500 text-sm">Manage tenant records and contact details.</p>
          </div>
          <button
            className="mt-4 md:mt-0 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => {
              setEditingTenant(null)
              setFullName('')
              setContactInfo('')
              setFormOpen(true)
            }}
          >
            ➕ Add Tenant
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded shadow p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Show</label>
              <select
                className="border rounded px-2 py-1"
                value={perPage}
                onChange={(e) => {
                  setPerPage(parseInt(e.target.value))
                  setCurrentPage(1)
                }}
              >
                {[5, 10, 20, 50, 100].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="border rounded px-3 py-1"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="px-4 py-2">Full Name</th>
                  <th className="px-4 py-2">Contact Info</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Current Apartment</th>
                  <th className="px-4 py-2">Created At</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((tenant) => (
                  <tr key={tenant.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">{tenant.full_name}</td>
                    <td className="px-4 py-2 text-gray-600">{tenant.contact_info}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        tenant.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {tenant.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {tenant.current_apartment ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {tenant.current_apartment.name}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tenant.current_apartment.payment_status === 'paid' 
                              ? 'bg-green-100 text-green-800'
                              : tenant.current_apartment.payment_status === 'partial'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {tenant.current_apartment.payment_status.charAt(0).toUpperCase() + 
                             tenant.current_apartment.payment_status.slice(1)}
                          </span>
                          {tenant.current_apartment.payment_status !== 'paid' && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              getDaysLeft(tenant.current_apartment.due_date) < 0
                                ? 'bg-red-100 text-red-800'
                                : getDaysLeft(tenant.current_apartment.due_date) <= 3
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {getDaysLeft(tenant.current_apartment.due_date) < 0
                                ? `${Math.abs(getDaysLeft(tenant.current_apartment.due_date))} days overdue`
                                : `${getDaysLeft(tenant.current_apartment.due_date)} days left`}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">Not assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-2">{new Date(tenant.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => {
                          setEditingTenant(tenant)
                          setFullName(tenant.full_name)
                          setContactInfo(tenant.contact_info || '')
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        className={`${
                          tenant.status === 'active' 
                            ? 'text-orange-600 hover:text-orange-800' 
                            : 'text-green-600 hover:text-green-800'
                        }`}
                        onClick={() => {
                          setTenantToUpdate(tenant)
                          setShowStatusConfirm(true)
                        }}
                        title={tenant.status === 'active' ? 'Deactivate Tenant' : 'Activate Tenant'}
                      >
                        {tenant.status === 'active' ? (
                          <XCircle className="w-5 h-5" />
                        ) : (
                          <CheckCircle className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center pt-4 text-sm text-gray-700">
            <span>
              Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-1">
              <button
                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                ◀ Prev
              </button>
              <button
                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pageCount))}
                disabled={currentPage === pageCount}
              >
                Next ▶
              </button>
            </div>
          </div>
        </div>

        {/* Form Modal */}
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-[90%] max-w-md space-y-4">
              <h2 className="text-xl font-semibold">{editingTenant ? 'Edit Tenant' : 'New Tenant'}</h2>
              <div>
                <label className="block text-sm font-medium">Full Name</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Contact Info</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={resetForm} className="text-gray-600 hover:underline">Cancel</button>
                <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Change Confirm Modal */}
        {showStatusConfirm && tenantToUpdate && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-[90%] max-w-sm shadow-xl">
              <h3 className="text-lg font-semibold mb-4 text-orange-600">
                {tenantToUpdate.status === 'active' ? 'Deactivate Tenant' : 'Activate Tenant'}
              </h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to {tenantToUpdate.status === 'active' ? 'deactivate' : 'activate'} <strong>{tenantToUpdate.full_name}</strong>?<br />
                {tenantToUpdate.status === 'active' 
                  ? 'This will prevent them from being assigned to new rentals, but their rental history will be preserved.'
                  : 'This will allow them to be assigned to new rentals again.'}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 text-gray-600 hover:underline"
                  onClick={() => {
                    setShowStatusConfirm(false)
                    setTenantToUpdate(null)
                  }}
                >
                  Cancel
                </button>
                <button
                  className={`px-4 py-2 text-white rounded ${
                    tenantToUpdate.status === 'active'
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                  onClick={handleStatusChange}
                >
                  {tenantToUpdate.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
