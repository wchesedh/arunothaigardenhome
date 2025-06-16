'use client'

import { use, useState, useEffect, useRef } from 'react'
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
  Clock2,
  User,
  Eye
} from 'lucide-react'
import AssignTenantModal from '@/components/AssignTenantModal'
import AddTenantToGroupModal from '@/components/AddTenantToGroupModal'
import ApartmentFormModal from '@/components/ApartmentFormModal'
import { supabase } from '@/lib/supabaseClient'

type Apartment = {
  id: string
  name: string
  description: string
  base_price: number
  room_count: number
  created_at: string
  next_payment_due: string | null
  photo_url?: string
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
  const [showRentalEditModal, setShowRentalEditModal] = useState(false)
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
  const [rentalFilter, setRentalFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all')
  const [showCancelled, setShowCancelled] = useState(false)
  const [paymentHistoryPerPage, setPaymentHistoryPerPage] = useState(10)
  const [currentPaymentPage, setCurrentPaymentPage] = useState(1)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false)

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
          ),
          previous_rental:apartment_tenants!previous_rental_id(*)
        `)
        .eq('apartment_id', apartment.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(`Failed to fetch apartment tenants: ${error.message}`)
      }

      // Check for rentals that need to be marked as completed
      const today = new Date()
      const currentRental = getCurrentRental(data || [])
      
      const rentalsToUpdate = (data || []).filter(rental => 
        rental.status === 'active' && 
        rental.payment_status === 'paid' && 
        new Date(rental.due_date) < today &&
        (!currentRental || rental.id !== currentRental.id) // Don't update if it's the current rental
      )

      if (rentalsToUpdate.length > 0) {
        const { error: updateError } = await supabase
          .from('apartment_tenants')
          .update({ status: 'completed' })
          .in('id', rentalsToUpdate.map(r => r.id))

        if (updateError) {
          console.error('Error updating rental statuses:', updateError)
        } else {
          // Refresh the data after updating
          const { data: updatedData, error: refreshError } = await supabase
            .from('apartment_tenants')
            .select(`
              *,
              members:apartment_tenant_members(
                id,
                added_at,
                tenant:tenants(*)
              ),
              previous_rental:apartment_tenants!previous_rental_id(*)
            `)
            .eq('apartment_id', apartment.id)
            .order('created_at', { ascending: false })

          if (!refreshError) {
            setApartmentTenants(updatedData || [])
            setHasExistingGroup(updatedData && updatedData.length > 0)
            return
          }
        }
      }

      setApartmentTenants(data || [])
      setHasExistingGroup(data && data.length > 0)
    } catch (err) {
      console.error('Error in fetchApartmentTenants:', err)
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

  const hasActiveRental = apartmentTenants.some(group => 
    group.status === 'active' && group.payment_status !== 'paid'
  );

  // Add this helper function to calculate rental dates
  const calculateRentalDates = (startDate: Date, durationMonths: number = 1) => {
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + durationMonths)
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    }
  }

  // Add this helper to get the next available start date
  const getNextAvailableStartDate = (rentals: ApartmentTenant[]) => {
    const today = new Date()
    const activeRentals = rentals.filter(r => r.status === 'active' || r.status === 'completed')
    
    if (activeRentals.length === 0) {
      return today.toISOString().split('T')[0]
    }

    // Find the latest end date among active rentals
    const latestEndDate = activeRentals.reduce((latest, rental) => {
      const endDate = new Date(rental.due_date)
      return endDate > latest ? endDate : latest
    }, new Date(0))

    // If the latest end date is in the past, use today
    if (latestEndDate < today) {
      return today.toISOString().split('T')[0]
    }

    // Otherwise, use the day after the latest end date
    const nextDay = new Date(latestEndDate)
    nextDay.setDate(nextDay.getDate() + 1)
    return nextDay.toISOString().split('T')[0]
  }

  // Modify the calculateNextDueDate function
  const calculateNextDueDate = (currentDueDate: string, startDate?: Date) => {
    const start = startDate || new Date()
    const nextMonth = new Date(start)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    return nextMonth.toISOString().split('T')[0]
  }

  // Modify handleOpenPaymentModal
  const handleOpenPaymentModal = (group: ApartmentTenant) => {
    setSelectedRentalForPayment(group)
    const today = new Date()
    const nextDates = calculateRentalDates(today)
    setNextDueDate(nextDates.end)
    setRenewalTenants(group.members.map(m => m.tenant))
    setShowPaymentModal(true)
  }

  // Modify handlePayment
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
          paid_at: today.toISOString()
        })
        .eq('id', selectedRentalForPayment.id)

      if (paymentError) throw paymentError

      if (renewRental && selectedRentalForPayment) {
        // Calculate new rental dates starting from today
        const newDates = calculateRentalDates(today)
        
        // Create a new rental record for the next month
        const { data: newRental, error: newRentalError } = await supabase
          .from('apartment_tenants')
          .insert({
            apartment_id: selectedRentalForPayment.apartment_id,
            assigned_date: newDates.start,
            due_date: newDates.end,
            price: selectedRentalForPayment.price,
            payment_status: 'unpaid',
            status: 'active',
            previous_rental_id: selectedRentalForPayment.id
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
    if (rentalFilter === 'all') {
      return showCancelled ? true : group.status !== 'cancelled';
    }
    return group.status === rentalFilter;
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

  // Find the current rental group (today between created_at/assigned_date and due_date)
  const getCurrentRental = (rentals: ApartmentTenant[]) => {
    const today = new Date();
    // Rentals whose period includes today
    const inPeriod = rentals.filter(rental => {
      const start = new Date(rental.created_at); // or rental.assigned_date
      const end = new Date(rental.due_date);
      end.setHours(23, 59, 59, 999); // inclusive
      return start <= today && today <= end;
    });
    if (inPeriod.length > 0) {
      // If multiple, pick the one with the closest due date
      return inPeriod.reduce((a, b) => new Date(a.due_date) < new Date(b.due_date) ? a : b, inPeriod[0]);
    }
    // If today is before all due dates, pick the one with the closest due date in the future and a start date before today
    const futureRentals = rentals.filter(rental => {
      const start = new Date(rental.created_at);
      const due = new Date(rental.due_date);
      return start <= today && today < due;
    });
    if (futureRentals.length > 0) {
      return futureRentals.reduce((a, b) => new Date(a.due_date) < new Date(b.due_date) ? a : b, futureRentals[0]);
    }
    // If today is after all due dates, return null
    return null;
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const filePath = `apartments/${apartment.id}.${fileExt}`

    console.log('Uploading to:', filePath, file)

    // Upload to Supabase Storage
    let { error: uploadError } = await supabase.storage
      .from('apartment-photos')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      alert('Upload failed! ' + (uploadError.message || JSON.stringify(uploadError)))
      setUploading(false)
      return
    }

    // Get public URL
    const { data } = supabase.storage.from('apartment-photos').getPublicUrl(filePath)
    const photoUrl = data.publicUrl

    // Update apartment record
    await supabase.from('apartments').update({ photo_url: photoUrl }).eq('id', apartment.id)

    setUploading(false)
    window.location.reload()
  }

  return (
    <div className="p-2 sm:p-4 md:p-6 space-y-6 max-w-full">
      {/* Header */}
      <div className="bg-white rounded shadow p-4 sm:p-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4 text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Apartments
        </button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{apartment.name}</h1>
            <p className="text-gray-500 text-xs sm:text-sm">Apartment Details</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className={`px-4 py-2.5 rounded-lg flex items-center gap-2.5 border shadow-sm ${getStatusColor(getApartmentStatus())} w-full sm:w-auto`}>
                <div className="p-1.5 bg-white/50 rounded-lg">
                  {getStatusIcon(getApartmentStatus())}
                </div>
                <div className={`font-semibold capitalize text-base ${
                  getApartmentStatus() === 'occupied' ? 'text-blue-700' :
                  getApartmentStatus() === 'available' ? 'text-green-700' :
                  'text-gray-700'
                }`}>
                  {getApartmentStatus()}
                </div>
              </div>
              {!hasActiveRental && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm hover:shadow w-full sm:w-auto text-sm"
                >
                  <Users className="w-4 h-4" />
                  Create Rental
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white rounded shadow p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Basic Info and Payment History */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Basic Information
                </h2>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit Basic Information"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              </div>
              {/* Apartment Photo Upload */}
              <div className="mb-6">
                {apartment.photo_url ? (
                  <div className="relative group aspect-square max-w-md mx-auto">
                    <img 
                      src={apartment.photo_url} 
                      alt="Apartment" 
                      className="w-full h-full object-contain rounded-lg shadow-sm transition-transform duration-300 group-hover:scale-[1.02] bg-gray-50" 
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 rounded-lg"></div>
                  </div>
                ) : (
                  <div className="aspect-square max-w-md mx-auto bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center rounded-lg border border-gray-200">
                    <div className="text-center">
                      <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No photo available</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name and Description Card */}
                <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Home className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">{apartment.name}</h3>
                      <div 
                        className="prose prose-sm max-w-none text-gray-600"
                        dangerouslySetInnerHTML={{ __html: apartment.description }}
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Base Price</div>
                        <div className="text-lg font-semibold text-gray-900">{apartment.base_price.toLocaleString()} THB</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <DoorOpen className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Rooms</div>
                        <div className="text-lg font-semibold text-gray-900">{apartment.room_count}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-50 rounded-lg">
                        <Clock className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Created</div>
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(apartment.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History Section */}
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <BarChart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Payment History</h2>
                  </div>
                </div>
                <select
                  value={paymentHistoryPerPage}
                  onChange={(e) => {
                    setPaymentHistoryPerPage(Number(e.target.value))
                    setCurrentPaymentPage(1)
                  }}
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                >
                  <option value="10">10 per page</option>
                  <option value="20">20 per page</option>
                  <option value="50">50 per page</option>
                </select>
              </div>

              {/* Payment Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-green-50 rounded-lg">
                      <DollarSign className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="text-sm text-gray-500">Total Payments Received</div>
                  </div>
                  <div className="text-2xl font-semibold text-green-600">
                    {paymentHistory.reduce((sum, payment) => sum + payment.price, 0).toLocaleString()} THB
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    {paymentHistory.length} payment{paymentHistory.length !== 1 ? 's' : ''} received
                  </div>
                </div>
                <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-50 rounded-lg">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-sm text-gray-500">Expected Payments</div>
                  </div>
                  <div className="text-2xl font-semibold text-blue-600">
                    {apartmentTenants
                      .filter(group => group.status === 'active')
                      .reduce((sum, group) => sum + group.price, 0)
                      .toLocaleString()} THB
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    {apartmentTenants.filter(group => group.status === 'active').length} active rental{apartmentTenants.filter(group => group.status === 'active').length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {loadingPayments ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-500">Loading payment history...</p>
                  </div>
                ) : paymentHistory.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-lg border border-gray-100">
                    <BarChart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No payment history available</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {paymentHistory
                        .slice(
                          (currentPaymentPage - 1) * paymentHistoryPerPage,
                          currentPaymentPage * paymentHistoryPerPage
                        )
                        .map((payment) => (
                          <div key={payment.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow overflow-x-auto">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-blue-50 rounded-lg">
                                    <Users className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div className="font-medium text-gray-900">
                                    {payment.members.map((m: any) => m.tenant.full_name).join(', ')}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <Calendar className="w-3.5 h-3.5" />
                                  Paid on {new Date(payment.paid_at).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-lg font-semibold text-green-600">
                                  {payment.price.toLocaleString()} THB
                                </div>
                                <div className="p-1.5 bg-green-50 rounded-lg">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Payment History Pagination */}
                    {Math.ceil(paymentHistory.length / paymentHistoryPerPage) > 1 && (
                      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
                        <div className="text-sm text-gray-500">
                          Showing {((currentPaymentPage - 1) * paymentHistoryPerPage) + 1} to {Math.min(currentPaymentPage * paymentHistoryPerPage, paymentHistory.length)} of {paymentHistory.length} payments
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => setCurrentPaymentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPaymentPage === 1}
                            className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 w-full sm:w-auto"
                          >
                            Previous
                          </button>
                          <div className="text-sm text-gray-600">
                            Page {currentPaymentPage} of {Math.ceil(paymentHistory.length / paymentHistoryPerPage)}
                          </div>
                          <button
                            onClick={() => setCurrentPaymentPage(prev => Math.min(prev + 1, Math.ceil(paymentHistory.length / paymentHistoryPerPage)))}
                            disabled={currentPaymentPage === Math.ceil(paymentHistory.length / paymentHistoryPerPage)}
                            className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 w-full sm:w-auto"
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

          {/* Right Column - Rental Groups */}
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Rental Groups</h2>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <select
                  value={rentalFilter}
                  onChange={(e) => {
                    setRentalFilter(e.target.value as 'all' | 'active' | 'completed' | 'cancelled')
                    setCurrentRentalPage(1)
                  }}
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                >
                  <option value="all">All Rentals</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <div className="relative">
                  <button
                    onClick={() => setShowMoreOptions(showMoreOptions === 'header' ? null : 'header')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </button>
                  {showMoreOptions === 'header' && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg z-10 border border-gray-200">
                      <div className="py-1">
                {rentalFilter === 'all' && (
                          <div className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4 text-gray-600" />
                              <span className="text-sm text-gray-700">Show Cancelled</span>
                            </div>
                    <button
                      onClick={() => setShowCancelled(!showCancelled)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        showCancelled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                  showCancelled ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                )}
                        <div className="px-4 py-2.5">
                          <label className="text-sm text-gray-700 mb-1.5 block">Items per page</label>
                <select
                  value={rentalGroupsPerPage}
                  onChange={(e) => {
                    setRentalGroupsPerPage(Number(e.target.value))
                    setCurrentRentalPage(1)
                  }}
                            className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="5">5 per page</option>
                  <option value="10">10 per page</option>
                  <option value="20">20 per page</option>
                  <option value="50">50 per page</option>
                </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
              <div className="space-y-6">
                  {paginatedRentalGroups.map((group) => {
                    const currentRental = getCurrentRental(apartmentTenants);
                    const isCurrentRental = currentRental && currentRental.id === group.id;
                    const today = new Date();
                    const dueDate = new Date(group.due_date);
                    const isFutureRental = !isCurrentRental && group.payment_status === 'unpaid' && dueDate > today && group.status !== 'cancelled';
                    return (
                      <div
                        key={group.id}
                        className={`bg-white border rounded-xl p-4 space-y-4 hover:shadow-lg transition-all duration-200 relative ${
                          isCurrentRental ? 'border-2 border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                        } ${group.payment_status === 'paid' ? 'overflow-hidden' : ''}`}
                      >
                        {/* Watermark for paid rentals */}
                        {group.payment_status === 'paid' && (
                          <div className="absolute inset-0 pointer-events-none select-none">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="relative w-64 h-64 flex items-center justify-center">
                                {/* Simple circular border */}
                                <div className="absolute inset-0 border-[3px] border-green-300/30 rounded-full"></div>
                                {/* Text with stamp effect */}
                                <div className="transform -rotate-45 text-green-300/40 font-bold text-5xl tracking-widest uppercase">
                                  PAID
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {/* Current rental badge */}
                        {isCurrentRental && (
                          <div className="absolute -top-3 left-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 z-10">
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            Current Rental
                          </div>
                        )}
                        {/* Pay Advance badge for future rentals */}
                        {!isCurrentRental && isFutureRental && (
                          <div className="absolute -top-3 left-4 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 z-10">
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            Reserved
                          </div>
                        )}
                        {/* Group Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-start gap-2">
                              <div className="p-2 bg-blue-50 rounded-lg shrink-0 mt-1">
                                <Calendar className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-800">
                                  {`Rental Group ${new Date(group.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}`}
                                </h3>
                                {group.status === 'cancelled' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
                                    Cancelled on {new Date(group.cancelled_at!).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-1.5 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
                                <Clock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                                <div>
                                  <div className="text-xs font-medium text-orange-600">Due Date</div>
                                  <div className="text-sm font-semibold text-orange-700">
                                    {new Date(group.due_date).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                                <DollarSign className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                <div>
                                  <div className="text-xs font-medium text-green-600">Monthly Rate</div>
                                  <div className="text-sm font-semibold text-green-700">
                                    {group.price.toLocaleString()} THB
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-start gap-2 shrink-0">
                            {/* Status badges */}
                            <div className="flex flex-wrap items-center gap-2">
                            {group.payment_status === 'unpaid' && group.status !== 'cancelled' ? (
                                <div className="flex items-center gap-2">
                                  <div className={`px-3 py-2 rounded-lg border ${getPaymentStatusColor(group.payment_status, getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).isWarning, group.due_date).bg} ${getPaymentStatusColor(group.payment_status, getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).isWarning, group.due_date).border}`}>
                                  {getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).warningText && (
                                      <div className="flex items-center gap-1.5 mb-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                        <div className="text-xs font-semibold text-orange-700">
                                        {getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).warningText}
                                      </div>
                                    </div>
                                  )}
                                    <div className="flex items-center gap-1.5">
                                      <div className={`w-1.5 h-1.5 rounded-full ${getPaymentStatusColor(group.payment_status, getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).isWarning, group.due_date).text}`} />
                                      <div className="text-xs font-medium">
                                      {getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).status}
                                    </div>
                                  </div>
                                  {getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).timing && (
                                    <div className={`text-xs mt-1 font-medium ${getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).timingColor || getPaymentStatusColor(group.payment_status, getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).isWarning, group.due_date).text}`}>
                                      {getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).timing}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                  <div className={`px-3 py-2 rounded-lg border ${getPaymentStatusColor(group.payment_status).bg} ${getPaymentStatusColor(group.payment_status).border}`}>
                                    <div className="flex items-center gap-1.5">
                                      <div className={`w-1.5 h-1.5 rounded-full ${getPaymentStatusColor(group.payment_status).text}`} />
                                      <div className="text-xs font-medium">
                                      {getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).status}
                                    </div>
                                  </div>
                                  {getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).date && (
                                    <div className={`text-xs mt-1 ${getPaymentStatusColor(group.payment_status).text}`}>
                                      {getPaymentStatusText(group.payment_status, group.paid_at, group.due_date).date}
                                    </div>
                                  )}
                                </div>
                                {/* LATE PAYMENT INDICATOR */}
                                {(group.payment_status === 'late' || (group.payment_status === 'paid' && group.paid_at && new Date(group.paid_at) > new Date(group.due_date))) && (
                                    <div className="px-3 py-2 rounded-lg border bg-yellow-50 border-yellow-200 flex items-center gap-1.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-600" />
                                      <div className="text-xs font-medium text-yellow-700">
                                      LATE PAYMENT
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="relative">
                                <div className={`px-3 py-2 rounded-lg text-xs font-medium border ${getStatusColor(group.status)}`}>
                                {group.status.charAt(0).toUpperCase() + group.status.slice(1)}
                              </div>
                            </div>
                            </div>
                            {/* More options button */}
                              {group.status !== 'completed' && (
                                <div className="relative">
                                  <button
                                    onClick={() => setShowMoreOptions(showMoreOptions === group.id ? null : group.id)}
                                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                  >
                                    <MoreVertical className="w-4 h-4 text-gray-600" />
                                  </button>
                                  {showMoreOptions === group.id && (
                                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg z-10 border border-gray-200">
                                      <div className="py-1">
                                        {group.status !== 'cancelled' ? (
                                          <>
                                            {group.payment_status === 'unpaid' && (isCurrentRental || isFutureRental) && (
                                              <button
                                                onClick={() => {
                                                  handleOpenPaymentModal(group);
                                                  setShowMoreOptions(null);
                                                }}
                                                disabled={updatingStatus === group.id}
                                                className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${isFutureRental ? 'text-blue-700' : 'text-blue-600'} hover:bg-blue-50 transition-colors`}
                                              >
                                                <CheckCircle className="w-4 h-4" />
                                                {isFutureRental ? 'Advance Payment' : 'Add Payment'}
                                              </button>
                                            )}
                                            <button
                                              onClick={() => {
                                                setSelectedGroupId(group.id)
                                                setShowAddToGroupModal(true)
                                                setShowMoreOptions(null)
                                              }}
                                              className="w-full text-left px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                                            >
                                              <UserPlus className="w-4 h-4" />
                                              Add Tenant
                                            </button>
                                            <button
                                              onClick={() => {
                                                setSelectedRental(group)
                                                setShowRentalEditModal(true)
                                                setShowMoreOptions(null)
                                              }}
                                              className="w-full text-left px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                                            >
                                              <Pencil className="w-4 h-4" />
                                              Edit Rental
                                            </button>
                                            {group.status === 'active' && group.payment_status !== 'paid' && (
                                              <button
                                                onClick={() => {
                                                  setGroupToCancel({
                                                    id: group.id,
                                                    date: group.due_date
                                                  });
                                                  setShowCancelConfirm(true);
                                                  setShowMoreOptions(null);
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                              >
                                                <XCircle className="w-4 h-4" />
                                                Cancel Rental
                                              </button>
                                            )}
                                          </>
                                        ) : (
                                          <button
                                            onClick={() => {
                                              handleActivateRental(group.id);
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2 transition-colors"
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
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                  <Users className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-700">
                                    {group.members.length === 1 ? 'Tenant' : 'Tenants'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {group.members.length === 0 ? 'No members' : 
                                     group.members.length === 1 ? '1 member' : 
                                     `${group.members.length} members`}
                                  </div>
                                </div>
                              </div>
                              {group.status === 'active' && (
                                <button
                                  onClick={() => {
                                    setSelectedGroupId(group.id)
                                    setShowAddToGroupModal(true)
                                  }}
                                  className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  Add Tenant
                                </button>
                              )}
                            </div>
                            {group.members.length === 0 ? (
                              <div className="text-center py-6 bg-white rounded-lg border border-gray-100">
                                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <div className="text-sm text-gray-500">No tenants in this group</div>
                                {group.status === 'active' && (
                                  <button
                                    onClick={() => {
                                      setSelectedGroupId(group.id)
                                      setShowAddToGroupModal(true)
                                    }}
                                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                  >
                                    Add your first tenant
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {group.members.map((member, index) => {
                                  // Generate initials from full name
                                  const initials = member.tenant.full_name
                                    .split(' ')
                                    .map(word => word[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2);

                                  // Color palette for profile pictures
                                  const colors = [
                                    'bg-blue-500 text-white',
                                    'bg-green-500 text-white',
                                    'bg-purple-500 text-white',
                                    'bg-pink-500 text-white',
                                    'bg-orange-500 text-white',
                                    'bg-teal-500 text-white',
                                    'bg-indigo-500 text-white',
                                    'bg-red-500 text-white'
                                  ];
                                  const colorIndex = index % colors.length;
                                  const bgColor = colors[colorIndex];

                                  return (
                                    <div key={member.tenant.id} className="bg-white rounded-lg p-4 border border-gray-100 hover:border-gray-200 transition-all duration-200 hover:shadow-sm">
                                      <div className="flex justify-between items-start">
                                        <div className="flex items-start gap-3">
                                          <div className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center font-medium text-sm`}>
                                            {initials}
                                          </div>
                                          <div>
                                            <div className="font-medium text-gray-900">{member.tenant.full_name}</div>
                                            {member.tenant.contact_info && (
                                              <div className="text-gray-500 text-xs mt-1 flex items-center gap-1.5">
                                                <Phone className="w-3 h-3" />
                                                {member.tenant.contact_info}
                                              </div>
                                            )}
                                            <div className="text-gray-500 text-xs mt-1 flex items-center gap-1.5">
                                              <Calendar className="w-3 h-3" />
                                              Added: {member.added_at ? new Date(member.added_at).toLocaleString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                              }) : 'N/A'}
                                            </div>
                                          </div>
                                        </div>
                                        {group.status === 'active' && (
                                          <div className="relative">
                                            <button
                                              onClick={() => setShowMoreOptions(showMoreOptions === `${group.id}-${member.tenant.id}` ? null : `${group.id}-${member.tenant.id}`)}
                                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                              <MoreVertical className="w-4 h-4 text-gray-600" />
                                            </button>
                                            {showMoreOptions === `${group.id}-${member.tenant.id}` && (
                                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10 border border-gray-200">
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
                                                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
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
                                  );
                                })}
                              </div>
                            )}
                        </div>

                        {/* Group Details - Only show cancellation reason if exists */}
                        {group.status === 'cancelled' && group.cancellation_reason && (
                          <div className="flex items-center gap-2 text-red-600 text-sm border-t pt-4">
                            <AlertTriangle className="w-4 h-4" />
                            <span>{group.cancellation_reason}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
          nextAvailableStartDate={getNextAvailableStartDate(apartmentTenants)}
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
      {showRentalEditModal && selectedRental && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Edit Rental</h2>
              <button
                onClick={() => {
                  setShowRentalEditModal(false)
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
                  setShowRentalEditModal(false)
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
                    setShowRentalEditModal(false)
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
                  if (renewRental) {
                    if (renewalTenants.length === 0) {
                      alert('Please select at least one tenant for renewal')
                      return
                    }
                    setShowRenewalConfirm(true)
                  } else {
                    setShowPaymentConfirm(true)
                  }
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

      {/* Edit Basic Information Modal */}
      {showEditModal && (
        <ApartmentFormModal
          apartment={apartment}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false)
            window.location.reload()
          }}
        />
      )}

      {/* Payment Confirmation Modal */}
      {showPaymentConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Confirm Payment</h3>
            <p className="text-gray-700 mb-6">
              You are about to process a payment of {selectedRentalForPayment?.price.toLocaleString()} THB.<br />
              Would you like to proceed?
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-gray-600 hover:underline"
                onClick={() => setShowPaymentConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => {
                  setShowPaymentConfirm(false)
                  handlePayment()
                }}
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 