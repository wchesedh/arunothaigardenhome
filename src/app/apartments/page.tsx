'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import ApartmentFormModal from '@/components/ApartmentFormModal'
import AdminLayout from '@/components/layouts/AdminLayout'
import { Pencil, Trash2, Eye, CheckCircle2, Users, Wrench, Clock2, AlertTriangle, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Apartment = {
  id: string
  name: string
  description: string
  base_price: number
  room_count: number
  created_at: string
  payment_status: string
  next_payment_due: string
  paid_at: string | null
}

export default function ApartmentsPage() {
  const router = useRouter()
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [apartmentTenants, setApartmentTenants] = useState<{[key: string]: any[]}>({})
  const [search, setSearch] = useState('')
  const [perPage, setPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [apartmentToDelete, setApartmentToDelete] = useState<Apartment | null>(null)
  const [sortBy, setSortBy] = useState<keyof Apartment>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const fetchApartments = async () => {
    const { data, error } = await supabase
      .from('apartments')
      .select('*')

    if (!error && data) {
      setApartments(data)
      // Fetch tenants for each apartment
      data.forEach(apartment => fetchApartmentTenants(apartment.id))
    } else console.error('Error fetching apartments:', error)
  }

  const fetchApartmentTenants = async (apartmentId: string) => {
    const { data, error } = await supabase
      .from('apartment_tenants')
      .select('*')
      .eq('apartment_id', apartmentId)
      .eq('status', 'active')

    if (!error && data) {
      setApartmentTenants(prev => ({
        ...prev,
        [apartmentId]: data
      }))
    }
  }

  useEffect(() => {
    fetchApartments()
  }, [])

  const getApartmentStatus = (apartmentId: string) => {
    const tenants = apartmentTenants[apartmentId] || []
    return tenants.length > 0 ? 'occupied' : 'available'
  }

  const sorted = [...apartments].sort((a, b) => {
    const fieldA = a[sortBy]
    const fieldB = b[sortBy]

    if (typeof fieldA === 'number' && typeof fieldB === 'number') {
      return sortDirection === 'asc' ? fieldA - fieldB : fieldB - fieldA
    }

    return sortDirection === 'asc'
      ? String(fieldA).localeCompare(String(fieldB))
      : String(fieldB).localeCompare(String(fieldA))
  })

  const filtered = sorted.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage)
  const pageCount = Math.ceil(filtered.length / perPage)

  const toggleSort = (field: keyof Apartment) => {
    if (field === sortBy) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortDirection('asc')
    }
  }

  const getSortIndicator = (field: keyof Apartment) => {
    if (sortBy !== field) return ''
    return sortDirection === 'asc' ? ' ▲' : ' ▼'
  }

  const handleSave = async () => {
    setModalOpen(false)
    setSelectedApartment(null)
    await fetchApartments()
  }

  const handleDelete = async () => {
    if (!apartmentToDelete) return

    const { error } = await supabase
      .from('apartments')
      .delete()
      .eq('id', apartmentToDelete.id)

    if (!error) {
      setApartments(apartments.filter((a) => a.id !== apartmentToDelete.id))
      setShowDeleteConfirm(false)
      setApartmentToDelete(null)
    } else {
      alert('Error deleting apartment')
    }
  }

  const handleViewDetails = (apartmentId: string) => {
    router.push(`/apartments/${apartmentId}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800'
      case 'occupied':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle2 className="w-4 h-4" />
      case 'occupied':
        return <Users className="w-4 h-4" />
      case 'maintenance':
        return <Wrench className="w-4 h-4" />
      default:
        return <Clock2 className="w-4 h-4" />
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

  const getPaymentStatus = (apartment: Apartment) => {
    if (!apartment.next_payment_due) return null

    const today = new Date()
    const dueDate = new Date(apartment.next_payment_due)
    const isLate = today > dueDate && apartment.payment_status !== 'paid'

    return {
      status: apartment.payment_status === 'paid' ? 'paid' : 'unpaid',
      isLate: isLate || apartment.payment_status === 'late'
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="bg-white rounded shadow p-6 flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🏢 Apartments</h1>
            <p className="text-gray-500 text-sm">Manage apartment records, pricing, and availability.</p>
          </div>
          <button
            className="mt-4 md:mt-0 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => {
              setSelectedApartment(null)
              setModalOpen(true)
            }}
          >
            ➕ Create Apartment
          </button>
        </div>

        {/* Table & Controls */}
        <div className="bg-white rounded shadow p-6 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Show:</label>
              <select
                className="border rounded p-1 bg-white"
                value={perPage}
                onChange={(e) => {
                  setPerPage(parseInt(e.target.value))
                  setCurrentPage(1)
                }}
              >
                {[5, 10, 20, 50, 100].map((num) => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
              <span className="text-sm text-gray-600">entries</span>
            </div>
            <input
              type="text"
              placeholder="Search apartments..."
              className="border rounded px-3 py-1 w-full md:w-64"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          {/* Table */}
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 cursor-pointer" onClick={() => toggleSort('name')}>
                    Name{getSortIndicator('name')}
                  </th>
                  <th className="text-left px-4 py-2 cursor-pointer" onClick={() => toggleSort('description')}>
                    Description{getSortIndicator('description')}
                  </th>
                  <th className="text-left px-4 py-2 cursor-pointer" onClick={() => toggleSort('base_price')}>
                    Base Price{getSortIndicator('base_price')}
                  </th>
                  <th className="text-left px-4 py-2 cursor-pointer" onClick={() => toggleSort('room_count')}>
                    Rooms{getSortIndicator('room_count')}
                  </th>
                  <th className="text-left px-4 py-2">
                    Status
                  </th>
                  <th className="text-left px-4 py-2">
                    Payment
                  </th>
                  <th className="text-left px-4 py-2">
                    Due Date
                  </th>
                  <th className="text-left px-4 py-2">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((apartment) => {
                  const paymentStatus = getPaymentStatus(apartment)
                  return (
                    <tr key={apartment.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{apartment.name}</td>
                      <td className="px-4 py-2">
                        <div 
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: apartment.description }}
                        />
                      </td>
                      <td className="px-4 py-2">{apartment.base_price.toLocaleString()} THB</td>
                      <td className="px-4 py-2">{apartment.room_count}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(getApartmentStatus(apartment.id))}`}>
                          {getApartmentStatus(apartment.id).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {paymentStatus ? (
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(paymentStatus.status)}`}>
                              {paymentStatus.status.toUpperCase()}
                            </span>
                            {paymentStatus.isLate && (
                              <span className="text-xs text-yellow-600 font-medium">
                                Overdue
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs">No active rental</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {apartment.next_payment_due ? (
                          <div className="text-xs text-gray-800">
                            {new Date(apartment.next_payment_due).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(apartment.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedApartment(apartment)
                              setModalOpen(true)
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setApartmentToDelete(apartment)
                              setShowDeleteConfirm(true)
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center text-sm text-gray-700 pt-4">
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
              {Array.from({ length: pageCount }).slice(
                Math.max(0, currentPage - 3),
                Math.min(pageCount, currentPage + 2)
              ).map((_, i) => {
                const page = Math.max(1, currentPage - 2) + i
                return (
                  <button
                    key={page}
                    className={`px-3 py-1 rounded ${currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                )
              })}
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

        {/* Modals */}
        {modalOpen && (
          <ApartmentFormModal
            apartment={selectedApartment}
            onClose={() => {
              setModalOpen(false)
              setSelectedApartment(null)
            }}
            onSaved={handleSave}
          />
        )}

        {showDeleteConfirm && apartmentToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-[90%] max-w-sm shadow-xl">
              <h3 className="text-lg font-semibold mb-4 text-red-600">Delete Apartment</h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <strong>{apartmentToDelete.name}</strong>?<br />
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 text-gray-600 hover:underline"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setApartmentToDelete(null)
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
