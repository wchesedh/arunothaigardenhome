import { Suspense } from 'react'
import { use } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdminLayout from '@/components/layouts/AdminLayout'
import { ArrowLeft } from 'lucide-react'
import ApartmentDetails from './ApartmentDetails'

type Apartment = {
  id: string
  name: string
  description: string
  base_price: number
  room_count: number
  created_at: string
}

async function getApartment(id: string) {
  const { data, error } = await supabase
    .from('apartments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export default function ApartmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const apartmentPromise = getApartment(resolvedParams.id)

  return (
    <AdminLayout>
      <Suspense fallback={
        <div className="p-6">
          <div className="bg-white rounded shadow p-6">
            <p className="text-gray-600">Loading apartment details...</p>
          </div>
        </div>
      }>
        <ApartmentDetails apartmentPromise={apartmentPromise} />
      </Suspense>
    </AdminLayout>
  )
} 