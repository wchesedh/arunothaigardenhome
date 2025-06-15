import { supabase } from './supabaseClient';

export async function getApartmentsWithTenants() {
  const { data, error } = await supabase
    .from('apartments')
    .select(`
      id,
      name,
      description,
      base_price,
      room_count,
      apartment_tenants (
        tenant_id,
        tenants ( id, full_name, email )
      )
    `);

  if (error) {
    console.error('Error fetching apartments with tenants:', error);
    return [];
  }

  return data;
}
