'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, MoreVertical, UserPlus } from 'lucide-react'
import AssignTenantModal from '@/components/AssignTenantModal'
import { supabase } from '@/lib/supabaseClient'

type Apartment = {
  id: string
  name: string
  description: string
  base_price: number
  room_count: number
  created_at: string
  next_payment_due: string | null
}

type Tenant = {
  id: string
  full_name: string
  contact_info: string | null
  created_at: string
}

type ApartmentTenant = {
  id: string
  apartment_id: string
  assigned_date: string
  due_date: string
  price: number
  payment_status: 'paid' | 'unpaid' | 'late'
  status: 'active' | 'completed' | 'ended'
  created_at: string
  members: {
    tenant: Tenant
    added_at: string
  }[]
}

type PaymentStatus = 'paid' | 'unpaid' | 'late'

export default function ApartmentDetails({ apartmentPromise }: { apartmentPromise: Promise<Apartment> }) {
  const router = useRouter()
  const apartment = use(apartmentPromise)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [apartmentTenants, setApartmentTenants] = useState<ApartmentTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [hasExistingGroup, setHasExistingGroup] = useState(false)

  const fetchApartmentTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('apartment_tenants')
        .select(`
          *,
          members:apartment_tenant_members(
            tenant:tenants(*)
          )
        `)
        .eq('apartment_id', apartment.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setApartmentTenants(data || [])
      setHasExistingGroup(data && data.length > 0)
    } catch (err) {
      console.error('Error fetching apartment tenants:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApartmentTenants()
  }, [apartment.id])

  const updatePaymentStatus = async (groupId: string, newStatus: PaymentStatus) => {
    setUpdatingStatus(groupId)
    try {
      const { error } = await supabase
        .from('apartment_tenants')
        .update({ payment_status: newStatus })
        .eq('id', groupId)

      if (error) throw error
      await fetchApartmentTenants()
    } catch (err) {
      console.error('Error updating payment status:', err)
    } finally {
      setUpdatingStatus(null)
    }
  }

  const updateGroupStatus = async (groupId: string, newStatus: 'active' | 'completed' | 'ended') => {
    setUpdatingStatus(groupId)
    try {
      const { error } = await supabase
        .from('apartment_tenants')
        .update({ status: newStatus })
        .eq('id', groupId)

      if (error) throw error
      await fetchApartmentTenants()
    } catch (err) {
      console.error('Error updating group status:', err)
    } finally {
      setUpdatingStatus(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'ended':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'unpaid':
        return 'bg-red-100 text-red-800'
      case 'late':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded shadow p-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Apartments
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{apartment.name}</h1>
            <p className="text-gray-500 text-sm">Apartment Details</p>
          </div>
          <button
            onClick={() => setShowAssignModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Assign Tenants
          </button>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white rounded shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-gray-900">{apartment.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-gray-900">{apartment.description}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Base Price</dt>
                <dd className="mt-1 text-gray-900">{apartment.base_price.toLocaleString()} THB</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Number of Rooms</dt>
                <dd className="mt-1 text-gray-900">{apartment.room_count}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created At</dt>
                <dd className="mt-1 text-gray-900">
                  {new Date(apartment.created_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Tenant Groups */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Tenant Group</h2>
              {!hasExistingGroup && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Assign Tenants
                </button>
              )}
            </div>

            {loading ? (
              <p className="text-gray-500">Loading tenant group...</p>
            ) : apartmentTenants.length === 0 ? (
              <div className="bg-white rounded-lg border p-6 text-center">
                <p className="text-gray-500">No tenants assigned to this apartment yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {apartmentTenants.map((group) => (
                  <div key={group.id} className="border rounded-lg p-4 space-y-3">
                    {/* Group Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-lg">
                          Group {new Date(group.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          Due: {new Date(group.due_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <select
                            value={group.payment_status}
                            onChange={(e) => updatePaymentStatus(group.id, e.target.value as PaymentStatus)}
                            disabled={updatingStatus === group.id}
                            className={`px-2 py-1 rounded-full text-xs font-medium appearance-none pr-8 cursor-pointer
                              ${getPaymentStatusColor(group.payment_status)}
                              ${updatingStatus === group.id ? 'opacity-50' : ''}`}
                          >
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="late">Late</option>
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                            <MoreVertical className="w-3 h-3" />
                          </div>
                        </div>
                        <div className="relative">
                          <select
                            value={group.status}
                            onChange={(e) => updateGroupStatus(group.id, e.target.value as 'active' | 'completed' | 'ended')}
                            disabled={updatingStatus === group.id}
                            className={`px-2 py-1 rounded-full text-xs font-medium appearance-none pr-8 cursor-pointer
                              ${getStatusColor(group.status)}
                              ${updatingStatus === group.id ? 'opacity-50' : ''}`}
                          >
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="ended">Ended</option>
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                            <MoreVertical className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Group Members */}
                    <div className="bg-gray-50 rounded p-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">Group Members</div>
                      <div className="space-y-2">
                        {group.members.map((member) => (
                          <div key={member.tenant.id} className="flex justify-between items-center text-sm">
                            <div>
                              <div className="font-medium">{member.tenant.full_name}</div>
                              {member.tenant.contact_info && (
                                <div className="text-gray-500">{member.tenant.contact_info}</div>
                              )}
                            </div>
                            <div className="text-gray-500 text-xs">
                              Added: {new Date(member.added_at).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Group Details */}
                    <div className="text-sm text-gray-500">
                      <div>Monthly Price: {group.price.toLocaleString()} THB</div>
                      <div>Assigned: {new Date(group.assigned_date).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Tenant Modal */}
      {showAssignModal && (
        <AssignTenantModal
          apartmentId={apartment.id}
          apartmentName={apartment.name}
          onClose={() => setShowAssignModal(false)}
          onSaved={() => {
            fetchApartmentTenants()
            setShowAssignModal(false)
          }}
        />
      )}
    </div>
  )
} 