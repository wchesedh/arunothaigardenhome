'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminLayout from '@/components/layouts/AdminLayout'
import { Pencil, Trash2 } from 'lucide-react'

type Tenant = {
  id: string
  full_name: string
  contact_info: string | null
  created_at: string
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null)

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false })
    if (!error && data) setTenants(data)
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
        .update({ full_name: fullName, contact_info: contactInfo })
        .eq('id', editingTenant.id)
      if (!error) {
        fetchTenants()
        resetForm()
      }
    } else {
      const { error } = await supabase.from('tenants').insert({ full_name: fullName, contact_info: contactInfo })
      if (!error) {
        fetchTenants()
        resetForm()
      }
    }
  }

  const handleDelete = async () => {
    if (!tenantToDelete) return
    const { error } = await supabase.from('tenants').delete().eq('id', tenantToDelete.id)
    if (!error) {
      fetchTenants()
      setShowDeleteConfirm(false)
      setTenantToDelete(null)
    }
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
                  <th className="px-4 py-2">Created At</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((tenant) => (
                  <tr key={tenant.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">{tenant.full_name}</td>
                    <td className="px-4 py-2 text-gray-600">{tenant.contact_info}</td>
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
                        className="text-red-600 hover:text-red-800"
                        onClick={() => {
                          setTenantToDelete(tenant)
                          setShowDeleteConfirm(true)
                        }}
                      >
                        <Trash2 className="w-5 h-5" />
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

        {/* Delete Confirm Modal */}
        {showDeleteConfirm && tenantToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-[90%] max-w-sm shadow-xl">
              <h3 className="text-lg font-semibold mb-4 text-red-600">Delete Tenant</h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <strong>{tenantToDelete.full_name}</strong>?<br />
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 text-gray-600 hover:underline"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setTenantToDelete(null)
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  onClick={handleDelete}
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
