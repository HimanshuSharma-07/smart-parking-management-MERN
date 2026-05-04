import { useEffect, useState, useCallback } from "react";
import { 
  Search, Download, Car, MoreVertical, 
  AlertCircle, CheckCircle2, XCircle, LogIn, LogOut, FileText
} from "lucide-react";
import { Menu } from "@headlessui/react";
import api from "../../services/api";
import { getSocket } from "../../services/socket";
import { generateInvoicePDF } from "../../utils/invoiceGenerator";
import { Skeleton } from "../../components/ui/Skeleton";

const Bookings = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const fetchBookings = useCallback(() => {
    setLoading(true);
    api.get("/admin/bookings")
      .then(res => setBookings(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Real-time updates for bookings ledger
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('booking:new', fetchBookings);
    socket.on('booking:entry', fetchBookings);
    socket.on('booking:completed', fetchBookings);
    socket.on('booking:cancelled', fetchBookings);
    socket.on('booking:updated', fetchBookings);
    socket.on('payment:updated', fetchBookings);

    return () => {
      socket.off('booking:new', fetchBookings);
      socket.off('booking:entry', fetchBookings);
      socket.off('booking:completed', fetchBookings);
      socket.off('booking:cancelled', fetchBookings);
      socket.off('booking:updated', fetchBookings);
      socket.off('payment:updated', fetchBookings);
    };
  }, [fetchBookings]);

  const handleMarkEntry = async (bookingId: string) => {
    try {
      await api.patch(`/bookings/${bookingId}/entry`);
      fetchBookings();
    } catch (err) {
      console.error("Entry failed", err);
    }
  };

  const handleMarkExit = async (bookingId: string, paymentMethod: "cash" | "online" = "cash") => {
    try {
      await api.patch(`/bookings/${bookingId}/complete`, { paymentMethod });
      fetchBookings();
    } catch (err) {
      console.error("Exit failed", err);
    }
  };

  const handleCancel = async (bookingId: string) => {
    try {
      await api.patch(`/bookings/${bookingId}/cancel`);
      fetchBookings();
    } catch (err) {
      console.error("Cancel failed", err);
    }
  };

  const exportToCSV = () => {
    const headers = ["User", "Vehicle", "Lot", "Slot", "In", "Out", "Amount", "Method", "Payment", "Booking"];
    const rows = filtered.map(b => [
      b.user?.fullName, b.vehicleNumber, b.lot?.lotName, b.slot?.slotNumber,
      new Date(b.startTime).toLocaleString(), new Date(b.endTime).toLocaleString(),
      b.payment?.amount, b.payment?.paymentMethod, b.payment?.paymentStatus, b.bookingStatus
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filtered = bookings.filter(b => {
    const mSearch = [b.user?.fullName, b.vehicleNumber, b.lot?.lotName].some(s => s?.toLowerCase().includes(query.toLowerCase()));
    const mStatus = status === "all" || b.bookingStatus === status;
    return mSearch && mStatus;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 border-b border-gray-200 pb-8">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="flex-1 h-12 rounded-xl" />
          <Skeleton className="w-32 h-12 rounded-xl" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
              <tr>
                {['User/Node', 'Location', 'Time Interval', 'Financials', 'Outcome', ''].map((h, i) => (
                  <th key={i} className="px-8 py-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[1, 2, 3, 4, 5].map(i => (
                <tr key={i}>
                  <td className="px-8 py-5"><div className="space-y-2"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-20" /></div></td>
                  <td className="px-8 py-5"><div className="space-y-2"><Skeleton className="h-5 w-24" /><Skeleton className="h-4 w-32" /></div></td>
                  <td className="px-8 py-5"><div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-40" /></div></td>
                  <td className="px-8 py-5"><div className="space-y-2"><Skeleton className="h-5 w-16" /><Skeleton className="h-4 w-24 rounded-full" /></div></td>
                  <td className="px-8 py-5"><Skeleton className="h-6 w-24 rounded-full" /></td>
                  <td className="px-8 py-5 text-right"><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 border-b border-gray-200 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Booking Management</h1>
          <p className="text-gray-600 font-medium">Full audit history of all parking nodes.</p>
        </div>
        <button onClick={exportToCSV} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-all shadow-sm">
          <Download className="w-4 h-4" /> Export Ledger
        </button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Users, Vehicles or Lots…" className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-gray-900/5 shadow-sm" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold uppercase tracking-tight cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/5">
          <option value="all">All States</option>
          <option value="reserved">Reserved</option>
          <option value="confirmed">Confirmed</option>
          <option value="active">Active (On-site)</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
            <tr>
              <th className="px-8 py-5">User/Node</th>
              <th className="px-8 py-5">Location</th>
              <th className="px-8 py-5">Time Interval</th>
              <th className="px-8 py-5">Financials</th>
              <th className="px-8 py-5">Outcome</th>
              <th className="px-8 py-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(b => (
              <tr key={b._id} className="hover:bg-gray-50/50 group border-b border-gray-50 last:border-0 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex flex-col"><span className="text-sm font-bold text-gray-900">{b.user?.fullName}</span><span className="text-[10px] font-semibold text-gray-500 flex items-center gap-1 uppercase tracking-tight"><Car className="w-3 h-3" /> {b.vehicleNumber}</span></div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex flex-col"><span className="text-xs font-bold text-gray-800">{b.lot?.lotName}</span><span className="text-[10px] font-semibold text-gray-500 uppercase tracking-tighter mt-0.5">Floor {b.slot?.floor} &bull; Spot {b.slot?.slotNumber}</span></div>
                </td>
                <td className="px-8 py-5 text-[11px] font-medium text-gray-600">
                  <div className="flex flex-col"><span>In: {new Date(b.startTime).toLocaleString()}</span><span>Out: {new Date(b.endTime).toLocaleString()}</span></div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex flex-col"><span className="text-sm font-bold text-gray-900">₹{b.payment?.amount || 0}</span><div className="flex gap-2 mt-1.5"><span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${b.payment?.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{b.payment?.paymentStatus || 'unpaid'}</span><span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{b.payment?.paymentMethod}</span></div></div>
                </td>
                <td className="px-8 py-5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase border ${
                    b.bookingStatus === 'active' ? 'bg-blue-100 text-blue-800 border-blue-200' : 
                    b.bookingStatus === 'reserved' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                    b.bookingStatus === 'confirmed' ? 'bg-teal-100 text-teal-800 border-teal-200' :
                    b.bookingStatus === 'completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 
                    'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                    {b.bookingStatus === 'active' ? <Car className="w-3 h-3" /> : 
                     b.bookingStatus === 'reserved' ? <AlertCircle className="w-3 h-3" /> :
                     b.bookingStatus === 'confirmed' ? <CheckCircle2 className="w-3 h-3" /> :
                     b.bookingStatus === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : 
                     <XCircle className="w-3 h-3" />}
                    {b.bookingStatus}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <Menu as="div" className="relative inline-block text-left">
                    <Menu.Button className="p-2 text-gray-400 hover:text-black transition-colors rounded-lg"><MoreVertical className="w-5 h-5" /></Menu.Button>
                    <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-xl shadow-xl border border-gray-200 focus:outline-none z-50 overflow-hidden divide-y divide-gray-100">
                        {['reserved', 'confirmed'].includes(b.bookingStatus) && (
                          <div className="px-1 py-1">
                            <Menu.Item>
                              {({ active }) => (
                                <button onClick={() => handleMarkEntry(b._id)} className={`${active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'} flex w-full items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all`}>
                                  <LogIn className="w-4 h-4" /> Mark Vehicle Entry
                                </button>
                              )}
                            </Menu.Item>
                          </div>
                        )}
                        {b.bookingStatus === 'active' && (
                          <div className="px-1 py-1">
                            <Menu.Item>
                              {({ active }) => (
                                <button onClick={() => handleMarkExit(b._id, "cash")} className={`${active ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'} flex w-full items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b border-gray-50`}>
                                  <LogOut className="w-4 h-4" /> Mark Exit (Cash)
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button onClick={() => handleMarkExit(b._id, "online")} className={`${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} flex w-full items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all`}>
                                  <LogOut className="w-4 h-4" /> Mark Exit (Online)
                                </button>
                              )}
                            </Menu.Item>
                          </div>
                        )}
                        <div className="px-1 py-1">
                          <Menu.Item>{({ active }) => <button className={`${active ? 'bg-gray-50' : ''} flex w-full items-center px-4 py-2.5 text-[10px] font-bold uppercase text-gray-500 transition-all`}>Customer details</button>}</Menu.Item>
                        </div>
                        {b.payment?.paymentStatus === 'paid' && (
                          <div className="px-1 py-1">
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => {
                                    generateInvoicePDF({
                                      bookingRef: `BK-${String(b._id).slice(-6).toUpperCase()}`,
                                      parkingLotName: b.lot?.lotName || 'Parking Lot',
                                      parkingLotAddress: b.lot?.address || '',
                                      spot: b.slot?.slotNumber || '—',
                                      floor: b.slot?.floor || 0,
                                      vehicleNumber: b.vehicleNumber,
                                      startTime: b.startTime,
                                      endTime: b.endTime,
                                      duration: Math.max(1, Math.ceil((new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 3_600_000)),
                                      totalPrice: b.payment?.amount || 0,
                                      paymentStatus: b.payment?.paymentStatus || 'unpaid',
                                      paymentMethod: b.payment?.paymentMethod,
                                      userName: b.user?.fullName,
                                    });
                                  }}
                                  className={`${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} flex w-full items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all`}
                                >
                                  <FileText className="w-4 h-4" /> Download Invoice
                                </button>
                              )}
                            </Menu.Item>
                          </div>
                        )}
                        {['reserved', 'confirmed', 'active'].includes(b.bookingStatus) && (
                          <div className="px-1 py-1">
                            <Menu.Item>
                              {({ active }) => (
                                <button onClick={() => handleCancel(b._id)} className={`${active ? 'bg-red-50 text-red-600' : 'text-gray-700'} flex w-full items-center px-4 py-2.5 text-[10px] font-bold uppercase transition-all`}>
                                  Cancel booking
                                </button>
                              )}
                            </Menu.Item>
                          </div>
                        )}
                      </Menu.Items>
                  </Menu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-20 text-gray-300 text-xs font-black uppercase tracking-[0.3em]">No corresponding logs found</div>}
      </div>
    </div>
  );
};

export default Bookings;