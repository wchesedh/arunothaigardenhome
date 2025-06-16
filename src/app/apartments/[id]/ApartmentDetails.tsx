'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Users, 
  MoreVertical, 
  UserPlus, 
  Trash2, 
  XCircle, 
  CheckCircle, 
  Pencil, 
  X, 
  AlertTriangle, 
  Calendar, 
  Search,
  Home,
  Info,
  DollarSign,
  DoorOpen,
  Clock,
  Building2,
  Phone,
  Mail,
  MapPin,
  Wrench,
  FileText,
  BarChart,
  Download,
  Upload,
  CheckCircle2,
  Clock2
} from 'lucide-react'
import AssignTenantModal from '@/components/AssignTenantModal'
import AddTenantToGroupModal from '@/components/AddTenantToGroupModal'
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
  status: 'active' | 'completed' | 'ended' | 'cancelled'
  created_at: string
  paid_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
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
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [apartmentTenants, setApartmentTenants] = useState<ApartmentTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [hasExistingGroup, setHasExistingGroup] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [tenantToRemove, setTenantToRemove] = useState<{ groupId: string; tenantId: string; tenantName: string } | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [groupToCancel, setGroupToCancel] = useState<{ id: string; date: string } | null>(null)
  const [showMoreOptions, setShowMoreOptions] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedRental, setSelectedRental] = useState<ApartmentTenant | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedRentalForPayment, setSelectedRentalForPayment] = useState<ApartmentTenant | null>(null)
  const [renewRental, setRenewRental] = useState(true)
  const [renewalTenants, setRenewalTenants] = useState<{ id: string; full_name: string; contact_info: string | null }[]>([])
  const [showRenewalConfirm, setShowRenewalConfirm] = useState(false)
  const [showAddTenantToRenewal, setShowAddTenantToRenewal] = useState(false)
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([])
  const [selectedNewTenant, setSelectedNewTenant] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewTenantForm, setShowNewTenantForm] = useState(false)
  const [newTenantData, setNewTenantData] = useState({
    full_name: '',
    contact_info: ''
  })
  const [nextDueDate, setNextDueDate] = useState<string>('')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showPaymentHistory, setShowPaymentHistory] = useState(true)
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [rentalGroupsPerPage, setRentalGroupsPerPage] = useState(5)
  const [currentRentalPage, setCurrentRentalPage] = useState(1)
  const [rentalFilter, setRentalFilter] = useState<'all' | 'active' | 'completed' | 'ended' | 'cancelled'>('all')

  const fetchApartmentTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('apartment_tenants')
        .select(`
          *,
          members:apartment_tenant_members(
            id,
            added_at,
            tenant:tenants(*)
          )
        `)
        .eq('apartment_id', apartment.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(`Failed to fetch apartment tenants: ${error.message}`)
      }

      setApartmentTenants(data || [])
      setHasExistingGroup(data && data.length > 0)
    } catch (err) {
      console.error('Error in fetchApartmentTenants:', err)
      // Show error to user
      alert('Failed to load apartment data. Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('full_name')

      if (error) throw error
      setAvailableTenants(data || [])
    } catch (err) {
      console.error('Error fetching tenants:', err)
    }
  }

  const fetchPaymentHistory = async () => {
    setLoadingPayments(true)
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
        .eq('payment_status', 'paid')
        .order('paid_at', { ascending: false })

      if (error) throw error
      setPaymentHistory(data || [])
    } catch (err) {
      console.error('Error fetching payment history:', err)
    } finally {
      setLoadingPayments(false)
    }
  }

  useEffect(() => {
    fetchApartmentTenants()
    fetchPaymentHistory()
  }, [apartment.id])

  useEffect(() => {
    if (showPaymentModal) {
      fetchAvailableTenants()
    }
  }, [showPaymentModal])

  const updatePaymentStatus = async (groupId: string) => {
    setUpdatingStatus(groupId)
    try {
      const group = apartmentTenants.find(g => g.id === groupId)
      if (!group) return

      const today = new Date()
      const dueDate = new Date(group.due_date)
      const isLate = today > dueDate

      // Update payment status to paid and record the payment date
      const { error: paymentError } = await supabase
        .from('apartment_tenants')
        .update({ 
          payment_status: isLate ? 'late' : 'paid',
          status: 'completed',
          paid_at: today.toISOString()
        })
        .eq('id', groupId)

      if (paymentError) throw paymentError
      await fetchApartmentTenants()
    } catch (err) {
      console.error('Error updating payment status:', err)
    } finally {
      setUpdatingStatus(null)
    }
  }

  const updateGroupStatus = async (groupId: string, newStatus: 'active' | 'completed' | 'ended' | 'cancelled') => {
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

  const getApartmentStatus = () => {
    const hasActiveRental = apartmentTenants.some(group => group.status === 'active')
    return hasActiveRental ? 'occupied' : 'available'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'ended':
        return 'bg-gray-100 text-gray-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle2 className="w-5 h-5" />
      case 'occupied':
        return <Users className="w-5 h-5" />
      case 'maintenance':
        return <Wrench className="w-5 h-5" />
      default:
        return <Clock2 className="w-5 h-5" />
    }
  }

  const getPaymentStatusColor = (status: string, isWarning: boolean = false, dueDate?: string) => {
    if (isWarning) {
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        border: 'border-orange-200'
      }
    }
    
    switch (status) {
      case 'paid':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200'
        }
      case 'unpaid':
        if (dueDate) {
          const today = new Date()
          const due = new Date(dueDate)
          const isLate = today > due
          return {
            bg: isLate ? 'bg-red-50' : 'bg-yellow-50',
            text: isLate ? 'text-red-700' : 'text-orange-800',
            border: isLate ? 'border-red-200' : 'border-yellow-200'
          }
        }
        return {
          bg: 'bg-yellow-50',
          text: 'text-orange-800',
          border: 'border-yellow-200'
        }
      case 'late':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200'
        }
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200'
        }
    }
  }

  const getPaymentStatusText = (status: string, paidAt: string | null, dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    // Check if payment was late
    const isLatePayment = status === 'paid' && paidAt && new Date(paidAt) > due
    
    switch (status) {
      case 'paid':
        return {
          status: 'PAID',
          date: paidAt ? `Paid on ${new Date(paidAt).toLocaleDateString()}` : 'Paid',
          timing: null,
          isWarning: false,
          warningText: null,
          isLatePayment
        }
      case 'unpaid':
        return {
          status: 'UNPAID',
          date: null,
          timing: daysUntilDue > 0 
            ? `${daysUntilDue} days until due`
            : `${Math.abs(daysUntilDue)} days overdue`,
          isWarning: daysUntilDue <= 3 && daysUntilDue > 0,
          warningText: daysUntilDue <= 3 && daysUntilDue > 0 
            ? 'Payment due soon!'
            : daysUntilDue <= 0 
              ? 'Payment overdue!'
              : null,
          isLatePayment: false,
          timingColor: daysUntilDue <= 0 ? 'text-red-600' : 'text-orange-800'
        }
      case 'late':
        return {
          status: 'LATE PAYMENT',
          date: paidAt ? `Paid on ${new Date(paidAt).toLocaleDateString()}` : 'Late',
          timing: null,
          isWarning: false,
          warningText: null,
          isLatePayment: true
        }
      default:
        return {
          status: status.toUpperCase(),
          date: null,
          timing: null,
          isWarning: false,
          warningText: null,
          isLatePayment: false
        }
    }
  }

  const handleRemoveTenant = async () => {
    if (!tenantToRemove) return;
    
    try {
      const { error } = await supabase
        .from('apartment_tenant_members')
        .delete()
        .eq('apartment_tenant_id', tenantToRemove.groupId)
        .eq('tenant_id', tenantToRemove.tenantId);

      if (error) throw error;
      
      await fetchApartmentTenants();
      setShowRemoveConfirm(false);
      setTenantToRemove(null);
    } catch (err) {
      console.error('Error removing tenant:', err);
    }
  };

  const handleCancelRental = async () => {
    if (!groupToCancel) return;
    
    try {
      // Update the rental group status to cancelled
      const { data, error: groupError } = await supabase
        .from('apartment_tenants')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', groupToCancel.id)
        .select();

      if (groupError) {
        console.error('Error cancelling rental:', {
          error: groupError,
          message: groupError.message,
          details: groupError.details,
          hint: groupError.hint,
          code: groupError.code
        });
        throw groupError;
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from update operation');
      }
      
      await fetchApartmentTenants();
      setShowCancelConfirm(false);
      setGroupToCancel(null);
    } catch (err) {
      console.error('Error cancelling rental:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      alert('Failed to cancel rental. Please try again.');
    }
  };

  const hasActiveRental = apartmentTenants.some(group => group.status === 'active');

  const calculateNextDueDate = (currentDueDate: string) => {
    const nextMonth = new Date(currentDueDate)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    return nextMonth.toISOString().split('T')[0]
  }

  const handleOpenPaymentModal = (group: ApartmentTenant) => {
    setSelectedRentalForPayment(group)
    setNextDueDate(calculateNextDueDate(group.due_date))
    setRenewalTenants(group.members.map(m => m.tenant))
    setShowPaymentModal(true)
  }

  const handlePayment = async () => {
    if (!selectedRentalForPayment) return;
    
    try {
      const today = new Date()
      const dueDate = new Date(selectedRentalForPayment.due_date)
      const isLate = today > dueDate

      // Update payment status to paid and record the payment date
      const { error: paymentError } = await supabase
        .from('apartment_tenants')
        .update({ 
          payment_status: isLate ? 'late' : 'paid',
          status: 'completed',
          paid_at: today.toISOString()
        })
        .eq('id', selectedRentalForPayment.id)

      if (paymentError) throw paymentError

      if (renewRental) {
        const { data: newRental, error: newRentalError } = await supabase
          .from('apartment_tenants')
          .insert({
            apartment_id: selectedRentalForPayment.apartment_id,
            assigned_date: today.toISOString(),
            due_date: nextDueDate,
            price: selectedRentalForPayment.price,
            payment_status: 'unpaid',
            status: 'active'
          })
          .select()
          .single()

        if (newRentalError) throw newRentalError

        // Add selected tenants to the new rental
        const { error: membersError } = await supabase
          .from('apartment_tenant_members')
          .insert(
            renewalTenants.map(tenant => ({
              apartment_tenant_id: newRental.id,
              tenant_id: tenant.id,
              added_at: today.toISOString()
            }))
          )

        if (membersError) throw membersError
      }

      await fetchApartmentTenants()
      setShowPaymentModal(false)
      setSelectedRentalForPayment(null)
      setRenewRental(true)
      setRenewalTenants([])
      setNextDueDate('')
    } catch (err) {
      console.error('Error processing payment:', err)
      alert('Error processing payment. Please try again.')
    }
  }

  const handleAddNewTenant = async () => {
    if (!newTenantData.full_name) {
      alert('Please enter tenant name')
      return
    }

    try {
      const { data: newTenant, error } = await supabase
        .from('tenants')
        .insert({
          full_name: newTenantData.full_name,
          contact_info: newTenantData.contact_info || null
        })
        .select()
        .single()

      if (error) throw error

      setRenewalTenants([...renewalTenants, newTenant])
      setNewTenantData({ full_name: '', contact_info: '' })
      setShowNewTenantForm(false)
      await fetchAvailableTenants()
    } catch (err) {
      console.error('Error adding new tenant:', err)
      alert('Error adding new tenant. Please try again.')
    }
  }

  const filteredRentalGroups = apartmentTenants.filter(group => {
    if (rentalFilter === 'all') return true
    return group.status === rentalFilter
  })

  const paginatedRentalGroups = filteredRentalGroups.slice(
    (currentRentalPage - 1) * rentalGroupsPerPage,
    currentRentalPage * rentalGroupsPerPage
  )

  const totalRentalPages = Math.ceil(filteredRentalGroups.length / rentalGroupsPerPage)

  const handleActivateRental = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('apartment_tenants')
        .update({ 
          status: 'active',
          cancelled_at: null
        })
        .eq('id', groupId)
        .select();

      if (error) {
        console.error('Error activating rental:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from update operation');
      }
      
      await fetchApartmentTenants();
      setShowMoreOptions(null);
    } catch (err) {
      console.error('Error activating rental:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      alert('Failed to activate rental. Please try again.');
    }
  };

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
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${getStatusColor(getApartmentStatus())}`}>
              {getStatusIcon(getApartmentStatus())}
              <span className="capitalize">{getApartmentStatus()}</span>
            </div>
            {!hasActiveRental && (
          <button
            onClick={() => setShowAssignModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
                Create Rental
          </button>
            )}
          </div>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white rounded shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Basic Info and Payment History */}
          <div className="space-y-6">
            {/* Basic Information */}
          <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Basic Information
              </h2>
            <dl className="space-y-4">
                {/* Name and Description */}
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                  <dt className="text-sm font-medium text-blue-600 flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Name
                  </dt>
                  <dd className="mt-1 text-gray-900 font-medium">{apartment.name}</dd>
              </div>
                <div className="bg-purple-50 border border-purple-100 p-4 rounded-lg">
                  <dt className="text-sm font-medium text-purple-600 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Description
                  </dt>
                  <dd className="mt-1 text-gray-900">
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: apartment.description }}
                    />
                  </dd>
              </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-100 p-4 rounded-lg">
                    <dt className="text-sm font-medium text-green-600 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Base Price
                    </dt>
                    <dd className="mt-1 text-gray-900 font-medium">{apartment.base_price.toLocaleString()} THB</dd>
              </div>
                  <div className="bg-orange-50 border border-orange-100 p-4 rounded-lg">
                    <dt className="text-sm font-medium text-orange-600 flex items-center gap-2">
                      <DoorOpen className="w-4 h-4" />
                      Rooms
                    </dt>
                    <dd className="mt-1 text-gray-900 font-medium">{apartment.room_count}</dd>
              </div>
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
                    <dt className="text-sm font-medium text-indigo-600 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Created
                    </dt>
                    <dd className="mt-1 text-gray-900 font-medium">
                      {new Date(apartment.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                </dd>
                  </div>
              </div>
            </dl>
          </div>

            {/* Payment History Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-blue-600" />
                  Payment History
                </h2>
              </div>

              {/* Payment Summary */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white border rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Total Payments Received</div>
                  <div className="text-2xl font-semibold text-green-600">
                    {paymentHistory.reduce((sum, payment) => sum + payment.price, 0).toLocaleString()} THB
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {paymentHistory.length} payment{paymentHistory.length !== 1 ? 's' : ''} received
                  </div>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Expected Payments</div>
                  <div className="text-2xl font-semibold text-blue-600">
                    {apartmentTenants
                      .filter(group => group.status === 'active')
                      .reduce((sum, group) => sum + group.price, 0)
                      .toLocaleString()} THB
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {apartmentTenants.filter(group => group.status === 'active').length} active rental{apartmentTenants.filter(group => group.status === 'active').length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {loadingPayments ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : paymentHistory.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No payment history available
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentHistory.map((payment) => (
                      <div key={payment.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">
                              {payment.members.map((m: any) => m.tenant.full_name).join(', ')}
                            </div>
                            <div className="text-sm text-gray-500">
                              Paid on {new Date(payment.paid_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-lg font-semibold text-green-600">
                            {payment.price.toLocaleString()} THB
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Rental Groups */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Rental Groups
              </h2>
              <div className="flex items-center gap-4">
                <select
                  value={rentalFilter}
                  onChange={(e) => {
                    setRentalFilter(e.target.value as 'all' | 'active' | 'completed' | 'ended' | 'cancelled')
                    setCurrentRentalPage(1)
                  }}
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Rentals</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="ended">Ended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select
                  value={rentalGroupsPerPage}
                  onChange={(e) => {
                    setRentalGroupsPerPage(Number(e.target.value))
                    setCurrentRentalPage(1)
                  }}
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="5">5 per page</option>
                  <option value="10">10 per page</option>
                  <option value="20">20 per page</option>
                  <option value="50">50 per page</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-lg border p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-500">Loading rental groups...</p>
              </div>
            ) : filteredRentalGroups.length === 0 ? (
              <div className="bg-white rounded-lg border p-6 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No rental groups found.</p>
              </div>
            ) : (
              <>
              <div className="space-y-4">
                  {paginatedRentalGroups.map((group) => (
                    <div key={group.id} className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                    {/* Group Header */}
                    <div className="flex justify-between items-start">
                      <div>
                          <div className="font-medium text-lg flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            Rental Group {new Date(group.created_at).toLocaleDateString()}
                            {group.status === 'cancelled' && (
                              <span className="text-sm text-red-600">
                                (Cancelled on {new Date(group.cancelled_at!).toLocaleDateString()})
                              </span>
                            )}
                        </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Clock className="w-4 h-4" />
                          Due: {new Date(group.due_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                          {group.payment_status === 'unpaid' && group.status !== 'cancelled' ? (
                            <div className="flex items-center gap-3">
                              <div className={`px-4 py-2 rounded-lg border ${getPaymentStatusColor(group.payment_status, getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).isWarning, group.due_date).bg} ${getPaymentStatusColor(group.payment_status, getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).isWarning, group.due_date).border}`}>
                                {getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).warningText && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                                    <div className="text-sm font-semibold text-orange-700">
                                      {getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).warningText}
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${getPaymentStatusColor(group.payment_status, getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).isWarning, group.due_date).text}`} />
                                  <div className="text-sm font-medium">
                                    {getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).status}
                                  </div>
                                </div>
                                {getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).timing && (
                                  <div className={`text-xs mt-1 font-medium ${getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).timingColor || getPaymentStatusColor(group.payment_status, getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).isWarning, group.due_date).text}`}>
                                    {getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).timing}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleOpenPaymentModal(group)}
                                disabled={updatingStatus === group.id}
                                className={`px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition-colors ${
                                  getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).isWarning
                                    ? 'bg-orange-600 hover:bg-orange-700'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                } disabled:opacity-50`}
                              >
                                <CheckCircle className="w-4 h-4" />
                                Add Payment
                              </button>
                          </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className={`px-4 py-2 rounded-lg border ${getPaymentStatusColor(group.payment_status).bg} ${getPaymentStatusColor(group.payment_status).border}`}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${getPaymentStatusColor(group.payment_status).text}`} />
                                  <div className="text-sm font-medium">
                                    {getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).status}
                                  </div>
                                </div>
                                {getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).date && (
                                  <div className={`text-xs mt-1 ${getPaymentStatusColor(group.payment_status).text}`}>
                                    {getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).date}
                                  </div>
                                )}
                              </div>
                              {getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).isLatePayment && (
                                <div className="px-4 py-2 rounded-lg border bg-yellow-50 border-yellow-200">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-600" />
                                    <div className="text-sm font-medium text-yellow-700">
                                      LATE PAYMENT
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        <div className="relative">
                          <div className={`px-3 py-2 rounded-lg text-sm font-medium border ${getStatusColor(group.status)}`}>
                            {group.status.charAt(0).toUpperCase() + group.status.slice(1)}
                          </div>
                        </div>
                          {group.status !== 'completed' && (
                            <div className="relative">
                              <button
                                onClick={() => setShowMoreOptions(showMoreOptions === group.id ? null : group.id)}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-600" />
                              </button>
                              {showMoreOptions === group.id && (
                                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border">
                                  <div className="py-1">
                                    {group.status !== 'cancelled' ? (
                                      <>
                                        <button
                                          onClick={() => {
                                            setSelectedGroupId(group.id)
                                            setShowAddToGroupModal(true)
                                            setShowMoreOptions(null)
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                                        >
                                          <UserPlus className="w-4 h-4" />
                                          Add Tenant
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedRental(group)
                                            setShowEditModal(true)
                                            setShowMoreOptions(null)
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                                        >
                                          <Pencil className="w-4 h-4" />
                                          Edit Rental
                                        </button>
                                        <button
                                          onClick={() => {
                                            setGroupToCancel({
                                              id: group.id,
                                              date: new Date(group.created_at).toLocaleDateString()
                                            });
                                            setShowCancelConfirm(true);
                                            setShowMoreOptions(null);
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                          <XCircle className="w-4 h-4" />
                                          Cancel Rental
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          handleActivateRental(group.id);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                        Activate Rental
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Group Members */}
                    <div className="bg-gray-50 rounded p-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">Tenants</div>
                        {group.members.length === 0 ? (
                          <div className="text-sm text-gray-500 italic">No tenants in this group</div>
                        ) : (
                      <div className="space-y-2">
                        {group.members.map((member) => (
                          <div key={member.tenant.id} className="flex justify-between items-center text-sm">
                            <div>
                              <div className="font-medium">{member.tenant.full_name}</div>
                              {member.tenant.contact_info && (
                                <div className="text-gray-500">{member.tenant.contact_info}</div>
                              )}
                            </div>
                                <div className="flex items-center gap-3">
                            <div className="text-gray-500 text-xs">
                                    Added: {member.added_at ? new Date(member.added_at).toLocaleString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    }) : 'N/A'}
                                  </div>
                                  {group.status === 'active' && (
                                    <div className="relative">
                                      <button
                                        onClick={() => setShowMoreOptions(showMoreOptions === `${group.id}-${member.tenant.id}` ? null : `${group.id}-${member.tenant.id}`)}
                                        className="p-1 hover:bg-gray-100 rounded"
                                      >
                                        <MoreVertical className="w-4 h-4 text-gray-600" />
                                      </button>
                                      {showMoreOptions === `${group.id}-${member.tenant.id}` && (
                                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border">
                                          <div className="py-1">
                                            <button
                                              onClick={() => {
                                                setTenantToRemove({
                                                  groupId: group.id,
                                                  tenantId: member.tenant.id,
                                                  tenantName: member.tenant.full_name
                                                });
                                                setShowRemoveConfirm(true);
                                                setShowMoreOptions(null);
                                              }}
                                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                              Remove Tenant
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                            </div>
                          </div>
                        ))}
                      </div>
                        )}
                    </div>

                    {/* Group Details */}
                    <div className="text-sm text-gray-500">
                      <div>Monthly Price: {group.price.toLocaleString()} THB</div>
                        <div>Start Date: {new Date(group.assigned_date).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
                </div>

                {/* Pagination */}
                {totalRentalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Showing {((currentRentalPage - 1) * rentalGroupsPerPage) + 1} to {Math.min(currentRentalPage * rentalGroupsPerPage, filteredRentalGroups.length)} of {filteredRentalGroups.length} rentals
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentRentalPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentRentalPage === 1}
                        className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <div className="text-sm text-gray-600">
                        Page {currentRentalPage} of {totalRentalPages}
                      </div>
                      <button
                        onClick={() => setCurrentRentalPage(prev => Math.min(prev + 1, totalRentalPages))}
                        disabled={currentRentalPage === totalRentalPages}
                        className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
              </div>
                )}
              </>
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

      {/* Add Tenant to Group Modal */}
      {showAddToGroupModal && selectedGroupId && (
        <AddTenantToGroupModal
          groupId={selectedGroupId}
          apartmentId={apartment.id}
          onClose={() => {
            setShowAddToGroupModal(false)
            setSelectedGroupId(null)
          }}
          onSaved={() => {
            fetchApartmentTenants()
            setShowAddToGroupModal(false)
            setSelectedGroupId(null)
          }}
        />
      )}

      {/* Remove Tenant Confirmation Modal */}
      {showRemoveConfirm && tenantToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Remove Tenant</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to remove <strong>{tenantToRemove.tenantName}</strong> from this rental group?<br />
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-gray-600 hover:underline"
                onClick={() => {
                  setShowRemoveConfirm(false);
                  setTenantToRemove(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={handleRemoveTenant}
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Rental Confirmation Modal */}
      {showCancelConfirm && groupToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Cancel Rental</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to cancel the rental group from <strong>{groupToCancel.date}</strong>?<br />
              This will mark the rental as cancelled and hide it from active rentals.<br />
              The rental history will be preserved for record-keeping.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-gray-600 hover:underline"
                onClick={() => {
                  setShowCancelConfirm(false);
                  setGroupToCancel(null);
                }}
              >
                Keep Rental
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={handleCancelRental}
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Rental Modal */}
      {showEditModal && selectedRental && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Edit Rental</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedRental(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={selectedRental.due_date}
                  onChange={(e) => setSelectedRental(prev => prev ? { ...prev, due_date: e.target.value } : null)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Price
                </label>
                <input
                  type="number"
                  value={selectedRental.price}
                  onChange={(e) => setSelectedRental(prev => prev ? { ...prev, price: parseFloat(e.target.value) } : null)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedRental(null)
                }}
                className="px-4 py-2 text-gray-600 hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedRental) return
                  try {
                    const { error } = await supabase
                      .from('apartment_tenants')
                      .update({
                        due_date: selectedRental.due_date,
                        price: selectedRental.price
                      })
                      .eq('id', selectedRental.id)

                    if (error) throw error
                    await fetchApartmentTenants()
                    setShowEditModal(false)
                    setSelectedRental(null)
                  } catch (err) {
                    console.error('Error updating rental:', err)
                    alert('Error updating rental. Please try again.')
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {showPaymentModal && selectedRentalForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-4xl shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Confirm Payment</h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setSelectedRentalForPayment(null)
                  setRenewRental(true)
                  setRenewalTenants([])
                  setSelectedNewTenant('')
                  setShowNewTenantForm(false)
                  setNewTenantData({ full_name: '', contact_info: '' })
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Left Column - Payment Details */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">Payment Details</div>
                  <div className="font-medium">{selectedRentalForPayment.price.toLocaleString()} THB</div>
                  <div className="text-sm text-gray-500">
                    Due: {new Date(selectedRentalForPayment.due_date).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="renewRental"
                    checked={renewRental}
                    onChange={(e) => {
                      setRenewRental(e.target.checked)
                      if (e.target.checked) {
                        setRenewalTenants(selectedRentalForPayment.members.map(m => m.tenant))
                        setNextDueDate(calculateNextDueDate(selectedRentalForPayment.due_date))
                      } else {
                        setRenewalTenants([])
                        setNextDueDate('')
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="renewRental" className="text-sm font-medium text-gray-700">
                    Renew rental for next month
                  </label>
                </div>

                {renewRental && (
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <div className="text-sm text-blue-700">
                      Next payment due date
                    </div>
                    <input
                      type="date"
                      value={nextDueDate}
                      onChange={(e) => setNextDueDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Right Column - Tenant Selection */}
              {renewRental && (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Current Tenants</div>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {selectedRentalForPayment.members.map((member) => (
                        <div key={member.tenant.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`tenant-${member.tenant.id}`}
                            checked={renewalTenants.some(t => t.id === member.tenant.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRenewalTenants([...renewalTenants, member.tenant])
                              } else {
                                setRenewalTenants(renewalTenants.filter(t => t.id !== member.tenant.id))
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor={`tenant-${member.tenant.id}`} className="text-sm text-gray-700">
                            {member.tenant.full_name}
                            {member.tenant.contact_info && (
                              <span className="text-gray-500 ml-1">({member.tenant.contact_info})</span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Add Additional Tenants</div>
                    <div className="space-y-3">
                      <div className="relative">
                        <select
                          value={selectedNewTenant}
                          onChange={(e) => {
                            const tenant = availableTenants.find(t => t.id === e.target.value)
                            if (tenant) {
                              setRenewalTenants([...renewalTenants, tenant])
                              setSelectedNewTenant('')
                            }
                          }}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                          <option value="">Select a tenant...</option>
                          {availableTenants
                            .filter(tenant => !renewalTenants.some(t => t.id === tenant.id))
                            .map(tenant => (
                              <option key={tenant.id} value={tenant.id}>
                                {tenant.full_name}
                                {tenant.contact_info ? ` (${tenant.contact_info})` : ''}
                              </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <span className="text-sm text-gray-500">or</span>
                        <div className="flex-1 h-px bg-gray-200"></div>
                      </div>

                      {!showNewTenantForm ? (
                        <button
                          onClick={() => setShowNewTenantForm(true)}
                          className="w-full text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1"
                        >
                          <UserPlus className="w-4 h-4" />
                          Add New Tenant
                        </button>
                      ) : (
                        <div className="space-y-3 border rounded-lg p-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Full Name
                            </label>
                            <input
                              type="text"
                              value={newTenantData.full_name}
                              onChange={(e) => setNewTenantData(prev => ({ ...prev, full_name: e.target.value }))}
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter tenant's full name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Contact Info (Optional)
                            </label>
                            <input
                              type="text"
                              value={newTenantData.contact_info}
                              onChange={(e) => setNewTenantData(prev => ({ ...prev, contact_info: e.target.value }))}
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter contact information"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setShowNewTenantForm(false)
                                setNewTenantData({ full_name: '', contact_info: '' })
                              }}
                              className="px-3 py-1 text-sm text-gray-600 hover:underline"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleAddNewTenant}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Add Tenant
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Selected Tenants for Renewal</div>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {renewalTenants.map((tenant) => (
                        <div key={tenant.id} className="flex justify-between items-center text-sm">
                          <div>
                            {tenant.full_name}
                            {tenant.contact_info && (
                              <span className="text-gray-500 ml-1">({tenant.contact_info})</span>
                            )}
                          </div>
                          <button
                            onClick={() => setRenewalTenants(renewalTenants.filter(t => t.id !== tenant.id))}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setSelectedRentalForPayment(null)
                  setRenewRental(true)
                  setRenewalTenants([])
                  setSelectedNewTenant('')
                  setShowNewTenantForm(false)
                  setNewTenantData({ full_name: '', contact_info: '' })
                }}
                className="px-4 py-2 text-gray-600 hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (renewRental && renewalTenants.length === 0) {
                    alert('Please select at least one tenant for renewal')
                    return
                  }
                  setShowRenewalConfirm(true)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tenant to Renewal Modal */}
      {showAddTenantToRenewal && selectedRentalForPayment && (
        <AddTenantToGroupModal
          groupId={selectedRentalForPayment.id}
          apartmentId={apartment.id}
          onClose={() => setShowAddTenantToRenewal(false)}
          onSaved={(newTenants) => {
            setRenewalTenants([...renewalTenants, ...newTenants])
            setShowAddTenantToRenewal(false)
          }}
        />
      )}

      {/* Renewal Confirmation Modal */}
      {showRenewalConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Confirm Renewal</h3>
            <p className="text-gray-700 mb-6">
              You are about to renew the rental with {renewalTenants.length} tenant{renewalTenants.length !== 1 ? 's' : ''}.<br />
              The new rental period will start from today and be due next month.<br />
              Would you like to proceed?
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-gray-600 hover:underline"
                onClick={() => setShowRenewalConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => {
                  setShowRenewalConfirm(false)
                  handlePayment()
                }}
              >
                Confirm Renewal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 