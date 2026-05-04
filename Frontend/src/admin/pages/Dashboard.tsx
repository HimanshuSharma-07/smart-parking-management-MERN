import { useEffect, useState } from "react";
import { Users, Clock, IndianRupee, Layers, Calendar, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import StatCard from "../components/StatCard";
import QuickVehicleAction from "../components/QuickVehicleAction";
import { useAppSelector } from "../../store/hooks";
import { getSocket } from "../../services/socket";
import { Skeleton } from "../../components/ui/Skeleton";

const Dashboard = () => {
  const user = useAppSelector((state) => state.auth.user);
  const [stats, setStats] = useState<any>({});
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get today's date in YYYY-MM-DD format for the default value
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const fetchDashboardData = async (date = "") => {
    setLoading(true);
    try {
      const statsQuery = date ? `?date=${date}` : "";
      
      const [statsRes, bookingsRes, paymentsRes] = await Promise.all([
        api.get(`/admin/stats${statsQuery}`),
        api.get("/admin/bookings"),
        api.get("/admin/payments")
      ]);
      
      setStats(statsRes.data.data);
      setRecentBookings(bookingsRes.data.data.slice(0, 5));
      setRecentPayments(paymentsRes.data.data.slice(0, 5));
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedDate);
  }, [selectedDate]);

  // Real-time updates for admin dashboard
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleRefresh = () => {
      void fetchDashboardData(selectedDate);
    };

    socket.on('booking:new', handleRefresh);
    socket.on('booking:completed', handleRefresh);
    socket.on('booking:cancelled', handleRefresh);
    socket.on('booking:updated', handleRefresh);
    socket.on('payment:created', handleRefresh);
    socket.on('payment:verified', handleRefresh);
    socket.on('slot:statusUpdate', handleRefresh);

    return () => {
      socket.off('booking:new', handleRefresh);
      socket.off('booking:completed', handleRefresh);
      socket.off('booking:cancelled', handleRefresh);
      socket.off('booking:updated', handleRefresh);
      socket.off('payment:created', handleRefresh);
      socket.off('payment:verified', handleRefresh);
      socket.off('slot:statusUpdate', handleRefresh);
    };
  }, [selectedDate]);

  if (loading && !stats.slots) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-5 w-48" />
              </div>
              <Skeleton className="h-14 w-40 rounded-xl" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <Skeleton className="h-96 rounded-2xl" />
              </div>
              <div className="lg:col-span-2 space-y-8">
                <Skeleton className="h-96 rounded-2xl" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {[1, 2].map(i => <Skeleton key={i} className="h-80 rounded-xl" />)}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8 pb-12">
          
          {/* Theme Aligned Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
              <p className="text-gray-600">
                Welcome back, <span className="font-semibold">{user?.fullName || "Admin"}</span>
              </p>
            </div>

            {/* Date Selector Card */}
            <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Report Date</p>
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-sm font-semibold text-gray-900 bg-transparent focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
             {loading && (
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl">
                 <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
              </div>
            )}
            <StatCard 
              title="Total Slots" 
              value={stats.slots || 0} 
              icon={Layers} 
              colorClass="text-gray-600 bg-gray-100" 
            />
            <StatCard 
              title="Active Bookings" 
              value={stats.bookings || 0} 
              icon={Clock} 
              colorClass="text-orange-600 bg-orange-100" 
            />
            <StatCard 
              title="Today's Revenue" 
              value={`₹${stats.revenue?.toLocaleString() || 0}`} 
              icon={IndianRupee} 
              colorClass="text-emerald-600 bg-emerald-100" 
            />
            <StatCard 
              title="Global Users" 
              value={stats.users || 0} 
              icon={Users} 
              colorClass="text-blue-600 bg-blue-100" 
            />
          </div>

          {/* Real-time Analytics Overlay */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Quick Gate Control */}
            <div className="lg:col-span-1">
              <QuickVehicleAction 
                onActionSuccess={() => fetchDashboardData(selectedDate)}
              />
            </div>

            {/* Network Utilization Card */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden group h-full">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">System Utilization</h3>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">Real-time slot occupancy across the network</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-2xl font-bold text-gray-900 leading-none">
                      {((stats.bookings / stats.slots) * 100 || 0).toFixed(1)}%
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Occupancy</span>
                  </div>
                </div>
                
                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                  <div 
                    className="absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                    style={{ width: `${(stats.bookings / stats.slots) * 100 || 0}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-gray-50">
                   <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{stats.slots || 0}</div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Nodes</div>
                   </div>
                   <div className="text-center">
                      <div className="text-lg font-bold text-emerald-600">{ (stats.slots - stats.bookings) || 0}</div>
                      <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Available</div>
                   </div>
                   <div className="text-center">
                      <div className="text-lg font-bold text-indigo-600">{stats.bookings || 0}</div>
                      <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Occupied</div>
                   </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Recent Bookings: Aligned Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Recent Bookings</h3>
                <Link to="/admin/bookings" className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-700 transition-colors">
                  View All <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4">Vehicle</th>
                      <th className="px-6 py-4">Spot</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentBookings.map((b, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{b.vehicleNumber}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">Spot {b.slot?.slotNumber} &middot; Floor {b.slot?.floor}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            b.bookingStatus === 'active' ? 'bg-blue-100 text-blue-800' : 
                            b.bookingStatus === 'reserved' ? 'bg-indigo-100 text-indigo-800' :
                            b.bookingStatus === 'completed' ? 'bg-emerald-100 text-emerald-800' : 
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {b.bookingStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {recentBookings.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-gray-400 text-sm">No activity recorded for this date</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Revenue: Aligned Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Revenue Stream</h3>
                <Link to="/admin/payments" className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-700 transition-colors">
                  Full Ledger <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Method</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentPayments.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{p.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-medium uppercase">{p.paymentMethod}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            p.paymentStatus === 'successful' || p.paymentStatus === 'completed' ? 'bg-emerald-100 text-emerald-800' : 
                            'bg-red-100 text-red-700'
                          }`}>
                            {p.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {recentPayments.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-gray-400 text-sm">No transactions found for this date</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;