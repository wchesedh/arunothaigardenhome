'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/layouts/AdminLayout';
import { 
  Users, 
  Home, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Building2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type DashboardStats = {
  totalApartments: number;
  activeRentals: number;
  totalTenants: number;
  totalPayments: number;
  monthlyRevenue: number;
  occupancyRate: number;
  pendingPayments: number;
  recentPayments: {
    id: string;
    amount: number;
    apartment_name: string;
    paid_at: string;
  }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalApartments: 0,
    activeRentals: 0,
    totalTenants: 0,
    totalPayments: 0,
    monthlyRevenue: 0,
    occupancyRate: 0,
    pendingPayments: 0,
    recentPayments: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch total apartments
        const { count: apartmentsCount } = await supabase
          .from('apartments')
          .select('*', { count: 'exact', head: true });

        // Fetch active rentals
        const { data: activeRentals } = await supabase
          .from('apartment_tenants')
          .select('*')
          .eq('status', 'active');

        // Fetch total tenants
        const { count: tenantsCount } = await supabase
          .from('tenants')
          .select('*', { count: 'exact', head: true });

        // Fetch payments
        const { data: payments } = await supabase
          .from('apartment_tenants')
          .select(`
            *,
            apartment:apartments(name)
          `)
          .eq('payment_status', 'paid')
          .order('paid_at', { ascending: false });

        // Calculate monthly revenue (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const monthlyPayments = payments?.filter(p => new Date(p.paid_at) >= thirtyDaysAgo) || [];
        const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + p.price, 0);

        // Calculate occupancy rate
        const occupancyRate = apartmentsCount ? (activeRentals?.length || 0) / apartmentsCount * 100 : 0;

        // Get pending payments
        const { data: pendingPayments } = await supabase
          .from('apartment_tenants')
          .select('*')
          .eq('payment_status', 'unpaid')
          .eq('status', 'active');

        setStats({
          totalApartments: apartmentsCount || 0,
          activeRentals: activeRentals?.length || 0,
          totalTenants: tenantsCount || 0,
          totalPayments: payments?.length || 0,
          monthlyRevenue,
          occupancyRate,
          pendingPayments: pendingPayments?.length || 0,
          recentPayments: payments?.slice(0, 5).map(p => ({
            id: p.id,
            amount: p.price,
            apartment_name: p.apartment.name,
            paid_at: p.paid_at
          })) || []
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="bg-blue-600 rounded-lg shadow p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-blue-100">Welcome to your property management dashboard</p>
              </div>
              <div className="text-blue-100 text-sm">
                Last updated: {new Date().toLocaleString()}
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Units Card */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-blue-600 font-medium">Total Units</div>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-2">{stats.totalApartments}</div>
              <div className="text-sm text-gray-600">
                {stats.activeRentals} active rentals
              </div>
            </div>

            {/* Total Tenants Card */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-green-600 font-medium">Total Tenants</div>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-2">{stats.totalTenants}</div>
              <div className="text-sm text-gray-600">
                {stats.activeRentals} active tenants
              </div>
            </div>

            {/* Monthly Revenue Card */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-purple-600 font-medium">Monthly Revenue</div>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-2">
                {stats.monthlyRevenue.toLocaleString()} THB
              </div>
              <div className="text-sm text-gray-600">
                Last 30 days
              </div>
            </div>

            {/* Occupancy Rate Card */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-orange-600 font-medium">Occupancy Rate</div>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-2">
                {stats.occupancyRate}%
              </div>
              <div className="text-sm text-gray-600">
                Current occupancy
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Payments */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">Recent Payments</h2>
                </div>
              </div>
              <div className="space-y-4">
                {stats.recentPayments.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div>
                      <div className="font-medium text-gray-900">{payment.apartment_name}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(payment.paid_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-green-600">
                      {payment.amount.toLocaleString()} THB
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Payments */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">Pending Payments</h2>
                </div>
              </div>
              {stats.pendingPayments > 0 ? (
                <div className="p-6 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="text-3xl font-bold text-orange-700 mb-2">
                    {stats.pendingPayments}
                  </div>
                  <div className="text-orange-600">
                    Payments pending collection
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-green-50 rounded-lg border border-green-100">
                  <div className="text-3xl font-bold text-green-700 mb-2">
                    All Caught Up!
                  </div>
                  <div className="text-green-600">
                    No pending payments
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
