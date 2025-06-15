'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import ApartmentFormModal from '@/components/ApartmentFormModal'
import AdminLayout from '@/components/layouts/AdminLayout'

type Apartment = {
  id: string
  name: string
  description: string
  base_price: number
  room_count: number
  created_at: string
}

export default function ApartmentsPage() {
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [search, setSearch] = useState('')
  const [perPage, setPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [apartmentToDelete, setApartmentToDelete] = useState<Apartment | null>(null)

  const fetchApartments = async () => {
    const { data, error } = await supabase
      .from('apartments')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) setApartments(data)
    else console.error('Error fetching apartments:', error)
  }

  useEffect(() => {
    fetchApartments()
  }, [])

  const filtered = apartments.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage)
  const pageCount = Math.ceil(filtered.length / perPage)

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

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">🏢 Apartments</h1>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => {
              setSelectedApartment(null)
              setModalOpen(true)
            }}
          >
            ➕ Create Apartment
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
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
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-600">entries per page</span>
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
        <div className="overflow-auto rounded shadow bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Description</th>
                <th className="text-left px-4 py-2">Base Price</th>
                <th className="text-left px-4 py-2">Rooms</th>
                <th className="text-left px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((apt) => (
                <tr key={apt.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{apt.name}</td>
                  <td className="px-4 py-2 text-gray-600">{apt.description}</td>
                  <td className="px-4 py-2">{apt.base_price.toLocaleString()} THB</td>
                  <td className="px-4 py-2">{apt.room_count}</td>
                  <td className="px-4 py-2 space-x-2">
                    <button
                      className="text-blue-600 hover:underline text-sm"
                      onClick={() => {
                        setSelectedApartment(apt)
                        setModalOpen(true)
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="text-red-600 hover:underline text-sm"
                      onClick={() => {
                        setApartmentToDelete(apt)
                        setShowDeleteConfirm(true)
                      }}
                    >
                      🗑 Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex justify-between items-center text-sm text-gray-700">
          <span>
            Showing {(currentPage - 1) * perPage + 1}–
            {Math.min(currentPage * perPage, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              ◀ Prev
            </button>

            {Array.from({ length: pageCount })
              .slice(
                Math.max(0, currentPage - 3),
                Math.min(pageCount, currentPage + 2)
              )
              .map((_, i) => {
                const page = Math.max(1, currentPage - 2) + i
                return (
                  <button
                    key={page}
                    className={`px-3 py-1 rounded ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
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

        {/* Create/Edit Modal */}
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

        {/* Delete Confirm Modal */}
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
