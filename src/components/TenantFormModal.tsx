'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Props = {
  show: boolean
  onClose: () => void
  onRefresh: () => void
  tenant: {
    id: string
    full_name: string
    contact_info: string | null
  } | null
}

export default function TenantFormModal({ show, onClose, onRefresh, tenant }: Props) {
  const [form, setForm] = useState({ full_name: '', contact_info: '' })

  useEffect(() => {
    if (tenant) {
      setForm({
        full_name: tenant.full_name,
        contact_info: tenant.contact_info || '',
      })
    } else {
      setForm({ full_name: '', contact_info: '' })
    }
  }, [tenant])

  const handleSave = async () => {
    if (!form.full_name.trim()) return alert('Full name is required.')

    if (tenant) {
      await supabase.from('tenants').update(form).eq('id', tenant.id)
    } else {
      await supabase.from('tenants').insert([form])
    }

    onClose()
    onRefresh()
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[90%] max-w-sm shadow-xl">
        <h3 className="text-lg font-semibold mb-4">
          {tenant ? 'Edit Tenant' : 'Add Tenant'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Info</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={form.contact_info}
              onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="px-4 py-2 text-gray-600 hover:underline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
